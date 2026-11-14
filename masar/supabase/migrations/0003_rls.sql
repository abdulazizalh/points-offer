-- MASAR · Row Level Security
-- Principle: customers see their own data + public catalogue; business members see
-- only their own business; admins act through audited SECURITY DEFINER functions.
-- All queue writes go through masar_* functions, never direct table writes.

alter table public.users enable row level security;
alter table public.admin_roles enable row level security;
alter table public.saved_locations enable row level security;
alter table public.service_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_branches enable row level security;
alter table public.business_operating_hours enable row level security;
alter table public.services enable row level security;
alter table public.service_branches enable row level security;
alter table public.employees enable row level security;
alter table public.employee_services enable row level security;
alter table public.queue_sessions enable row level security;
alter table public.queue_tickets enable row level security;
alter table public.queue_events enable row level security;
alter table public.service_history enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- Never expose the check-in secret column to API roles.
revoke select (checkin_secret) on public.business_branches from anon, authenticated;

-- users
create policy users_self_read on public.users for select using (id = auth.uid() or is_admin('users.view'));
create policy users_self_update on public.users for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()) and status = (select status from public.users where id = auth.uid()));

create policy admin_roles_read on public.admin_roles for select using (user_id = auth.uid() or is_admin('users.view'));

create policy saved_locations_own on public.saved_locations for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- public catalogue (verified businesses only)
create policy categories_read on public.service_categories for select using (active or is_admin());
create policy categories_admin on public.service_categories for all using (is_admin('categories.manage')) with check (is_admin('categories.manage'));

create policy businesses_public_read on public.businesses for select
  using (verification = 'verified' or is_business_member(id) or is_admin('businesses.view'));
create policy businesses_owner_update on public.businesses for update using (is_business_owner(id))
  with check (is_business_owner(id) and verification = (select verification from public.businesses b where b.id = businesses.id));
create policy businesses_register on public.businesses for insert with check (owner_id = auth.uid() and verification = 'pending' and not is_demo);

create policy members_read on public.business_members for select using (user_id = auth.uid() or is_business_member(business_id) or is_admin());
create policy members_owner_write on public.business_members for all using (is_business_owner(business_id)) with check (is_business_owner(business_id));
-- the registering owner can add themselves to a business they just created
create policy members_self_owner on public.business_members for insert
  with check (user_id = auth.uid() and role = 'business_owner' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy branches_read on public.business_branches for select using (
  exists (select 1 from public.businesses b where b.id = business_id and (b.verification = 'verified' or is_business_member(b.id) or is_admin()))
);
create policy branches_owner_write on public.business_branches for all using (is_business_owner(business_id)) with check (is_business_owner(business_id));

create policy hours_read on public.business_operating_hours for select using (true);
create policy hours_owner_write on public.business_operating_hours for all
  using (is_business_owner((select business_id from public.business_branches where id = branch_id)))
  with check (is_business_owner((select business_id from public.business_branches where id = branch_id)));

create policy services_read on public.services for select using (
  exists (select 1 from public.businesses b where b.id = business_id and (b.verification = 'verified' or is_business_member(b.id) or is_admin()))
);
create policy services_owner_write on public.services for all using (is_business_owner(business_id)) with check (is_business_owner(business_id));

create policy service_branches_read on public.service_branches for select using (true);
create policy service_branches_owner_write on public.service_branches for all
  using (is_business_owner((select business_id from public.services where id = service_id)))
  with check (is_business_owner((select business_id from public.services where id = service_id)));

-- employees: public sees nothing personal; members manage their own business
create policy employees_member_read on public.employees for select using (is_business_member(business_id) or is_admin());
create policy employees_owner_write on public.employees for all using (is_business_owner(business_id)) with check (is_business_owner(business_id));
create policy employee_services_member on public.employee_services for select
  using (is_business_member((select business_id from public.employees where id = employee_id)));
create policy employee_services_owner on public.employee_services for all
  using (is_business_owner((select business_id from public.employees where id = employee_id)))
  with check (is_business_owner((select business_id from public.employees where id = employee_id)));

-- queue: sessions are public (status only); tickets are own-or-business; no direct writes
create policy sessions_read on public.queue_sessions for select using (true);
create policy tickets_read on public.queue_tickets for select using (user_id = auth.uid() or is_business_member(business_id) or is_admin('analytics.view'));
create policy events_read on public.queue_events for select using (
  exists (select 1 from public.queue_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_business_member(t.business_id) or is_admin('analytics.view')))
);
create policy history_read on public.service_history for select using (is_business_member((select business_id from public.business_branches where id = branch_id)) or is_admin());

-- Aggregate, anonymous line stats for public screens (no personal data).
create or replace view public.branch_live_stats with (security_invoker = false) as
  select s.branch_id,
         count(*) filter (where t.status in ('WAITING','ARRIVED')) as waiting,
         (array_agg(t.number order by t.called_at desc) filter (where t.status in ('CALLED','IN_SERVICE')))[1] as now_serving
  from public.queue_sessions s
  left join public.queue_tickets t on t.session_id = s.id
  where s.session_date = (now() at time zone 'Asia/Kuwait')::date
  group by s.branch_id;
grant select on public.branch_live_stats to anon, authenticated;

-- notifications
create policy notifications_own_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_own_mark on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews: public reads visible ones; writes only through masar_submit_review
create policy reviews_read on public.reviews for select using (not hidden or user_id = auth.uid() or is_business_member(business_id) or is_admin('reviews.moderate'));

create policy favorites_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reports_create on public.reports for insert with check (user_id = auth.uid() and status = 'open');
create policy reports_read on public.reports for select using (user_id = auth.uid() or is_admin('reports.manage'));

create policy audit_read on public.audit_logs for select using (is_admin('audit.view'));

-- Realtime: stream ticket changes (RLS still applies to subscribers).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.queue_tickets, public.notifications, public.queue_sessions;
  end if;
end $$;

-- Function grants: internal helpers stay private.
revoke all on function public.masar__log(public.queue_tickets, public.queue_event_type, public.ticket_status, text) from public;
revoke all on function public.masar__notify(public.queue_tickets, public.notification_type, jsonb) from public;
revoke all on function public.masar__after_change(uuid) from public;
revoke all on function public.masar__ticket_for_update(uuid) from public;
