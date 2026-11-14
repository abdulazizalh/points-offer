-- Behavioural tests for the server-side queue engine. Run via run_local.sh.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- fixtures
insert into auth.users (id, phone, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '96550000001', '{"full_name":"Owner"}'),
  ('00000000-0000-0000-0000-00000000000b', '96550000002', '{"full_name":"Customer B"}'),
  ('00000000-0000-0000-0000-00000000000c', '96550000003', '{"full_name":"Customer C"}'),
  ('00000000-0000-0000-0000-00000000000d', '96550000004', '{"full_name":"Customer D"}'),
  ('00000000-0000-0000-0000-00000000000e', '96550000005', '{"full_name":"Other Owner"}'),
  ('00000000-0000-0000-0000-00000000000f', '96550000006', '{"full_name":"Admin"}');
update public.users set role = 'business_owner' where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000e');
update public.users set role = 'admin' where id = '00000000-0000-0000-0000-00000000000f';
insert into public.admin_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000f', 'moderator');

insert into public.businesses (id, name_en, name_ar, category_id, owner_id, cr_number, verification)
values ('10000000-0000-0000-0000-000000000001', 'Test Barber', 'حلاق', 'cat_salon', '00000000-0000-0000-0000-00000000000a', 'CR-1', 'verified'),
       ('10000000-0000-0000-0000-000000000002', 'Pending Co', 'معلق', 'cat_salon', '00000000-0000-0000-0000-00000000000e', 'CR-2', 'pending');
insert into public.business_members values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'business_owner', false),
                                           ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'business_owner', false);
insert into public.business_branches (id, business_id, name_en, name_ar, area_id, lat, lng, postpone_positions)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 'الرئيسي', 'salmiya', 29.33, 48.07, 2);
insert into public.business_operating_hours select '20000000-0000-0000-0000-000000000001', d, '00:00', '23:59', false from generate_series(0, 6) d;
insert into public.services (id, business_id, name_en, name_ar, duration_min, prefix)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Haircut', 'قص', 20, 'A');
insert into public.service_branches values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
insert into public.employees (id, business_id, branch_id, name, counter) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Barber', '1');
insert into public.employee_services values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');

create temp table t_ids (k text primary key, id uuid);
grant all on t_ids to public;

create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create or replace function pg_temp.expect_error(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if sqlerrm <> msg then raise exception 'expected error % got %', msg, sqlerrm; end if;
    return;
  end;
  raise exception 'expected error % but statement succeeded: %', msg, sql;
end $$;

-- 1. sequential numbering
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into t_ids select 'b', (public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'remote')).id;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into t_ids select 'c', (public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'remote')).id;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into t_ids select 'd', (public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'remote')).id;
do $$ begin
  assert (select number from public.queue_tickets where id = (select id from t_ids where k = 'b')) = 'A-001', 'first ticket A-001';
  assert (select number from public.queue_tickets where id = (select id from t_ids where k = 'd')) = 'A-003', 'third ticket A-003';
  assert (select count(*) from public.queue_events where type = 'CREATED') = 3, 'events logged';
  assert (select count(*) from public.notifications where type = 'BOOKING_CONFIRMED') = 3, 'booking notifications';
end $$;
\echo 'PASS numbering + events + notifications'

-- 2. duplicate active ticket blocked
select pg_temp.expect_error($q$select public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'remote')$q$, 'duplicate_active_ticket');
\echo 'PASS duplicate blocked'

-- 3. walk-in requires staff; unverified business rejected; bad check-in code rejected
select pg_temp.expect_error($q$select public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'walk_in')$q$, 'forbidden');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect_error($q$select public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'onsite_qr', 'WRONG1')$q$, 'invalid_checkin_code');
\echo 'PASS walk-in/onsite guards'

-- 4. arrival needs code for customers
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error(format('select public.masar_confirm_arrival(%L, %L)', (select id from t_ids where k = 'b'), 'NOPE00'), 'invalid_checkin_code');
select public.masar_confirm_arrival((select id from t_ids where k = 'b'), public.masar__checkin_code('20000000-0000-0000-0000-000000000001', now()));
do $$ begin assert (select status from public.queue_tickets where id = (select id from t_ids where k = 'b')) = 'ARRIVED', 'arrived'; end $$;
\echo 'PASS arrival code'

-- 5. postpone: B moves back 2 places → order C, D, B ; only once ; only owner
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error(format('select public.masar_postpone_ticket(%L)', (select id from t_ids where k = 'b')), 'forbidden');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.masar_postpone_ticket((select id from t_ids where k = 'b'));
do $$ declare ord text; begin
  select string_agg(number, ',' order by priority desc, sort_key) into ord from public.queue_tickets where status in ('WAITING','ARRIVED');
  assert ord = 'A-002,A-003,A-001', 'postpone order ' || ord;
end $$;
select pg_temp.expect_error(format('select public.masar_postpone_ticket(%L)', (select id from t_ids where k = 'b')), 'already_postponed');
\echo 'PASS postpone'

-- 6. staff flow: other business cannot call; owner calls → C, start, complete → history row
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_error($q$select public.masar_call_next('20000000-0000-0000-0000-000000000001')$q$, 'forbidden');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare t public.queue_tickets; begin
  t := public.masar_call_next('20000000-0000-0000-0000-000000000001');
  assert t.number = 'A-002', 'called C first, got ' || t.number;
  perform public.masar_staff_transition(t.id, 'start');
  perform public.masar_staff_transition(t.id, 'complete');
  assert (select count(*) from public.service_history) = 1, 'history recorded';
  assert (select array_agg(type order by at, id)::text from public.queue_events where ticket_id = t.id) = '{CREATED,CALLED,STARTED,COMPLETED}', 'event trail';
end $$;
\echo 'PASS staff flow'

-- 7. reviews only for own completed ticket, once
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error(format('select public.masar_submit_review(%L, 5, 5, 5, %L)', (select id from t_ids where k = 'c'), 'x'), 'forbidden');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.masar_submit_review((select id from t_ids where k = 'c'), 5, 4, 5, 'Great');
select pg_temp.expect_error(format('select public.masar_submit_review(%L, 5, 5, 5, %L)', (select id from t_ids where k = 'c'), 'again'), 'review_not_allowed');
\echo 'PASS reviews'

-- 8. cancel, then can book again
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select public.masar_cancel_ticket((select id from t_ids where k = 'd'));
select public.masar_create_ticket('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'remote');
\echo 'PASS cancel + rebook'

-- 9. admin RBAC: moderator verifies but cannot suspend
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select public.masar_admin_set_business('10000000-0000-0000-0000-000000000002', 'verified', 'docs ok');
select pg_temp.expect_error($q$select public.masar_admin_set_business('10000000-0000-0000-0000-000000000002', 'suspended')$q$, 'forbidden');
do $$ begin assert (select count(*) from public.audit_logs where action = 'business.verified') = 1, 'audit'; end $$;
\echo 'PASS admin rbac + audit'

-- 10. RLS: a customer only sees their own tickets
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
revoke select on public.business_branches from authenticated;
grant select (id, business_id, name_en, name_ar, area_id, address_en, address_ar, lat, lng, phone, active, queue_type, remote_booking, allow_postpone, postpone_positions, max_queue, slot_minutes, slot_capacity, timezone, created_at) on public.business_branches to authenticated;
grant all on t_ids to authenticated;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.queue_tickets) = 1, 'customer sees only own ticket, saw ' || (select count(*) from public.queue_tickets);
  assert (select count(*) from public.notifications where user_id <> auth.uid()) = 0, 'no foreign notifications';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.queue_tickets) = 4, 'owner sees business tickets'; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
do $$ begin assert (select count(*) from public.queue_tickets) = 0, 'other owner sees none'; end $$;
reset role;
\echo 'PASS RLS isolation'
\echo 'ALL SQL TESTS PASSED'
