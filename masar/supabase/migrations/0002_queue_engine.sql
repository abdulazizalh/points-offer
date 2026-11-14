-- MASAR · server-side queue engine
-- All queue mutations go through these SECURITY DEFINER functions. Clients never
-- write queue_tickets directly (RLS denies it). Errors are raised with a stable
-- message that maps to ErrorCode in src/lib/types.ts.
-- Keep rules in sync with src/lib/engine.ts (covered by src/lib/engine.test.ts).

-- ───────────── helpers ─────────────
create or replace function public.masar_err(code text) returns void
language plpgsql as $$ begin raise exception '%', code using errcode = 'P0001'; end $$;

create or replace function public.is_admin(perm text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_roles a
    join users u on u.id = a.user_id and u.status = 'active'
    where a.user_id = auth.uid()
      and (perm is null or perm = any (case a.role
        when 'super_admin' then array['users.view','users.suspend','businesses.view','businesses.verify','categories.manage','reviews.moderate','reports.manage','audit.view','analytics.view']
        when 'moderator' then array['users.view','businesses.view','businesses.verify','reviews.moderate','reports.manage','analytics.view']
        when 'support' then array['users.view','businesses.view','reports.manage']
      end))
  )
$$;

create or replace function public.is_business_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members m join users u on u.id = m.user_id and u.status = 'active'
                 where m.business_id = b and m.user_id = auth.uid())
$$;

create or replace function public.is_business_owner(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members where business_id = b and user_id = auth.uid() and role = 'business_owner')
$$;

create or replace function public.is_clinical(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from business_members where business_id = b and user_id = auth.uid() and clinical)
      or exists (select 1 from employees where business_id = b and user_id = auth.uid() and clinical and active)
$$;

create or replace function public.branch_is_open(p_branch uuid, p_at timestamptz default now()) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b business_branches;
  h business_operating_hours;
  local_ts timestamp;
  mins int; o int; c int;
begin
  select * into b from business_branches where id = p_branch;
  if not found then return false; end if;
  local_ts := p_at at time zone b.timezone;
  select * into h from business_operating_hours where branch_id = p_branch and day = extract(dow from local_ts);
  if not found or h.closed then return false; end if;
  mins := extract(hour from local_ts) * 60 + extract(minute from local_ts);
  o := extract(hour from h.open_time) * 60 + extract(minute from h.open_time);
  c := extract(hour from h.close_time) * 60 + extract(minute from h.close_time);
  if c <= o then c := c + 1440; end if;
  if mins < o then mins := mins + 1440; end if;
  return mins >= o and mins < c;
end $$;

-- Rotating on-site check-in code (5-minute window, HMAC of the branch secret).
create or replace function public.masar__checkin_code(p_branch uuid, p_at timestamptz) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  secret bytea; digest bytea; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out text := ''; i int;
begin
  select checkin_secret into secret from business_branches where id = p_branch;
  digest := hmac(convert_to(floor(extract(epoch from p_at) / 300)::bigint::text, 'UTF8'), secret, 'sha256');
  for i in 0..5 loop
    out := out || substr(alphabet, (get_byte(digest, i) % 32) + 1, 1);
  end loop;
  return out;
end $$;
revoke all on function public.masar__checkin_code(uuid, timestamptz) from public;

-- Staff-only: read the current code for the in-branch display.
create or replace function public.masar_checkin_code(p_branch uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_business_member((select business_id from business_branches where id = p_branch)) then perform masar_err('forbidden'); end if;
  return masar__checkin_code(p_branch, now());
end $$;

create or replace function public.masar__verify_code(p_branch uuid, p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(upper(trim(p_code)) in (masar__checkin_code(p_branch, now()), masar__checkin_code(p_branch, now() - interval '5 minutes')), false)
$$;
revoke all on function public.masar__verify_code(uuid, text) from public;

create or replace function public.masar__log(t queue_tickets, p_type queue_event_type, p_from ticket_status, p_note text default null) returns void
language sql security definer set search_path = public as $$
  insert into queue_events (ticket_id, session_id, branch_id, type, from_status, to_status, actor_id, actor_role, note)
  values (t.id, t.session_id, t.branch_id, p_type, p_from, t.status, auth.uid(),
          coalesce((select role::text from users where id = auth.uid()), 'system'), p_note)
$$;

create or replace function public.masar__notify(t queue_tickets, p_type notification_type, p_vars jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
declare biz businesses; prefs jsonb;
begin
  if t.user_id is null then return; end if;
  select * into biz from businesses where id = t.business_id;
  select u.prefs into prefs from users u where u.id = t.user_id;
  insert into notifications (user_id, ticket_id, type, vars, delivery)
  values (t.user_id, t.id, p_type,
          jsonb_build_object('ticket', t.number, 'placeEn', biz.name_en, 'placeAr', biz.name_ar, 'counter', coalesce(t.counter, '')) || p_vars,
          jsonb_build_object('inApp', 'delivered',
                             'push', case when (prefs->>'push')::boolean then 'pending' else 'not_enabled' end,
                             'sms', case when (prefs->>'sms')::boolean then 'pending' else 'not_enabled' end,
                             'whatsapp', case when (prefs->>'whatsapp')::boolean then 'pending' else 'not_enabled' end));
end $$;

-- Average service minutes: configured duration blended with recent history.
create or replace function public.masar_service_minutes(p_branch uuid, p_service uuid) returns numeric
language sql stable security definer set search_path = public as $$
  with h as (
    select avg(service_min) a, count(*) n from (
      select service_min from service_history where branch_id = p_branch and service_id = p_service order by completed_at desc limit 300
    ) x
  )
  select case when h.n = 0 then s.duration_min::numeric
              else s.duration_min * (1 - h.n::numeric / (h.n + 20)) + h.a * (h.n::numeric / (h.n + 20)) end
  from services s, h where s.id = p_service
$$;

-- Waiting-time estimate as a range (low/high minutes).
create or replace function public.masar_estimate(p_session uuid, p_service uuid, p_before_sort double precision default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  br uuid; servers int; work numeric := 0; samples int; spread numeric; mid numeric;
begin
  select branch_id into br from queue_sessions where id = p_session;
  select greatest(1, count(*)) into servers from employees e join employee_services es on es.employee_id = e.id
    where e.branch_id = br and e.active and es.service_id = p_service;
  select coalesce(sum(masar_service_minutes(br, t.service_id)), 0) into work
    from queue_tickets t where t.session_id = p_session and t.status in ('WAITING','ARRIVED')
      and (p_before_sort is null or t.sort_key < p_before_sort);
  select work + coalesce(sum(greatest(masar_service_minutes(br, t.service_id) * 0.15,
                     masar_service_minutes(br, t.service_id) - extract(epoch from now() - coalesce(t.started_at, t.called_at, now())) / 60)), 0)
    into work from queue_tickets t where t.session_id = p_session and t.status in ('CALLED','IN_SERVICE');
  select count(*) into samples from service_history where branch_id = br;
  spread := case when samples > 2000 then 0.15 when samples > 200 then 0.25 else 0.4 end;
  mid := work / servers;
  return jsonb_build_object('low', greatest(0, floor(mid * (1 - spread))), 'high', greatest(floor(mid * (1 - spread)) + 1, ceil(mid * (1 + spread) + 1)), 'mid', round(mid, 1));
end $$;

-- Threshold notifications after any change that moves people forward.
create or replace function public.masar__after_change(p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; approach int;
begin
  for r in
    select t.*, (row_number() over (order by t.priority desc, t.sort_key)) - 1 as ahead
    from queue_tickets t where t.session_id = p_session and t.status in ('WAITING','ARRIVED')
  loop
    continue when r.user_id is null;
    select coalesce((prefs->>'approachingAt')::int, 3) into approach from users where id = r.user_id;
    if r.ahead = 0 and not (0 = any(r.notified)) then
      update queue_tickets set notified = notified || 0 where id = r.id;
      perform masar__notify((select q from queue_tickets q where q.id = r.id), 'TURN_NEXT', jsonb_build_object('ahead', r.ahead));
    elsif r.ahead between 1 and approach and r.ahead <> 5 and not ((100 + approach) = any(r.notified)) then
      update queue_tickets set notified = notified || (100 + approach) where id = r.id;
      perform masar__notify((select q from queue_tickets q where q.id = r.id), 'TURN_APPROACHING', jsonb_build_object('ahead', r.ahead));
    end if;
    if r.ahead = 5 and not (5 = any(r.notified)) then
      update queue_tickets set notified = notified || 5 where id = r.id;
      perform masar__notify((select q from queue_tickets q where q.id = r.id), 'FIVE_AHEAD', jsonb_build_object('ahead', 5));
    end if;
    if r.ahead <= 2 and r.arrived_at is null and not (200 = any(r.notified)) then
      update queue_tickets set notified = notified || 200 where id = r.id;
      perform masar__notify((select q from queue_tickets q where q.id = r.id), 'CONFIRM_ARRIVAL', jsonb_build_object('ahead', r.ahead));
    end if;
  end loop;
end $$;

create or replace function public.masar__ticket_for_update(p_ticket uuid) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare t queue_tickets;
begin
  select * into t from queue_tickets where id = p_ticket for update;
  if not found then perform masar_err('not_found'); end if;
  -- serialise per session
  perform 1 from queue_sessions where id = t.session_id for update;
  return t;
end $$;

-- ───────────── customer operations ─────────────
create or replace function public.masar_create_ticket(
  p_branch uuid, p_service uuid, p_channel ticket_channel,
  p_code text default null, p_slot_start timestamptz default null, p_guest_label text default null
) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  u users; b business_branches; s services; biz businesses; sess queue_sessions; t queue_tickets;
  qt queue_type; slotted boolean; staff boolean; line_count int; seq int; est jsonb; booked int; lim int;
  local_date date;
begin
  if uid is null then perform masar_err('forbidden'); end if;
  select * into u from users where id = uid;
  if not found then perform masar_err('forbidden'); end if;
  if u.status = 'suspended' then perform masar_err('account_suspended'); end if;
  select * into b from business_branches where id = p_branch;
  select * into s from services where id = p_service;
  if b.id is null or s.id is null or not exists (select 1 from service_branches where service_id = s.id and branch_id = b.id) then perform masar_err('not_found'); end if;
  select * into biz from businesses where id = b.business_id;
  if biz.verification <> 'verified' then perform masar_err('not_verified'); end if;
  staff := is_business_member(biz.id);
  if p_channel = 'walk_in' and not staff then perform masar_err('forbidden'); end if;
  if not b.active or not s.active then perform masar_err('branch_closed'); end if;
  qt := coalesce(s.queue_type, b.queue_type);
  slotted := qt in ('timed_entry', 'appointment');
  if not slotted and not branch_is_open(b.id) then perform masar_err('branch_closed'); end if;
  if p_channel = 'remote' and (not b.remote_booking or not s.remote_booking or qt = 'walk_in') then perform masar_err('remote_booking_disabled'); end if;
  if p_channel = 'onsite_qr' and not masar__verify_code(b.id, p_code) then perform masar_err('invalid_checkin_code'); end if;

  local_date := (now() at time zone b.timezone)::date;
  insert into queue_sessions (branch_id, session_date) values (b.id, local_date) on conflict (branch_id, session_date) do nothing;
  select * into sess from queue_sessions where branch_id = b.id and session_date = local_date for update; -- serialises numbering
  if sess.status <> 'open' then perform masar_err('branch_closed'); end if;

  select count(*) into line_count from queue_tickets where session_id = sess.id and status in ('WAITING','ARRIVED');
  lim := coalesce(s.max_queue, b.max_queue);
  if not slotted and line_count >= lim then perform masar_err('queue_full'); end if;

  if slotted then
    if p_slot_start is null or p_slot_start + make_interval(mins => coalesce(b.slot_minutes, 30)) < now()
       or not branch_is_open(b.id, p_slot_start) then perform masar_err('invalid_state'); end if;
    select count(*) into booked from queue_tickets where branch_id = b.id and service_id = s.id and slot_start = p_slot_start and status <> 'CANCELLED';
    if booked >= coalesce(b.slot_capacity, 10) then perform masar_err('slot_full'); end if;
  end if;

  seq := coalesce((sess.seq_by_prefix ->> s.prefix)::int, 0) + 1;
  update queue_sessions set seq_by_prefix = seq_by_prefix || jsonb_build_object(s.prefix, seq) where id = sess.id;
  est := masar_estimate(sess.id, s.id);

  begin
    insert into queue_tickets (session_id, branch_id, business_id, service_id, user_id, guest_label, number, sort_key, status, channel, queue_type,
                               slot_start, estimate_low, estimate_high, arrived_at)
    values (sess.id, b.id, biz.id, s.id, case when p_channel = 'walk_in' then null else uid end, left(p_guest_label, 40),
            s.prefix || '-' || lpad(seq::text, 3, '0'),
            extract(epoch from coalesce(p_slot_start, clock_timestamp())) * 1000,
            case when p_channel in ('onsite_qr','walk_in') then 'ARRIVED'::ticket_status else 'WAITING' end,
            p_channel, qt, p_slot_start, (est->>'low')::int, (est->>'high')::int,
            case when p_channel in ('onsite_qr','walk_in') then now() end)
    returning * into t;
  exception when unique_violation then
    perform masar_err('duplicate_active_ticket');
  end;

  perform masar__log(t, 'CREATED', null, p_channel::text);
  perform masar__notify(t, 'BOOKING_CONFIRMED', jsonb_build_object('low', est->'low', 'high', est->'high'));
  perform masar__after_change(sess.id);
  return t;
end $$;

-- Customers must present the rotating on-site code; staff may confirm without it.
create or replace function public.masar_confirm_arrival(p_ticket uuid, p_code text default null) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare t queue_tickets; prev ticket_status; staff boolean;
begin
  t := masar__ticket_for_update(p_ticket);
  staff := is_business_member(t.business_id);
  if not staff and (t.user_id is distinct from auth.uid()) then perform masar_err('forbidden'); end if;
  if t.status not in ('WAITING','CALLED') or t.arrived_at is not null then perform masar_err('invalid_state'); end if;
  if not staff and not masar__verify_code(t.branch_id, p_code) then perform masar_err('invalid_checkin_code'); end if;
  prev := t.status;
  update queue_tickets set arrived_at = now(), status = case when status = 'WAITING' then 'ARRIVED' else status end
    where id = t.id returning * into t;
  perform masar__log(t, 'ARRIVED', prev);
  return t;
end $$;

-- Postpone once; moves back N places (or to the end). Never moves ahead of anyone.
create or replace function public.masar_postpone_ticket(p_ticket uuid) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare
  t queue_tickets; b business_branches; prev ticket_status; n int; behind double precision[]; cnt int; new_key double precision; ahead int;
begin
  t := masar__ticket_for_update(p_ticket);
  if t.user_id is distinct from auth.uid() then perform masar_err('forbidden'); end if;
  select * into b from business_branches where id = t.branch_id;
  if not b.allow_postpone or t.queue_type in ('timed_entry','appointment') then perform masar_err('postpone_disabled'); end if;
  if t.postponed then perform masar_err('already_postponed'); end if;
  if t.status not in ('WAITING','ARRIVED','CALLED') then perform masar_err('invalid_state'); end if;
  n := b.postpone_positions;
  select array_agg(sort_key order by sort_key) into behind from queue_tickets
    where session_id = t.session_id and id <> t.id and status in ('WAITING','ARRIVED') and not priority
      and (t.status = 'CALLED' or sort_key > t.sort_key);
  cnt := coalesce(array_length(behind, 1), 0);
  if cnt = 0 then new_key := extract(epoch from clock_timestamp()) * 1000;
  elsif cnt <= n then new_key := behind[cnt] + 1;
  else new_key := behind[n] + (behind[n + 1] - behind[n]) / 2;
  end if;
  prev := t.status;
  update queue_tickets set sort_key = new_key, postponed = true, priority = false,
    status = case when status = 'CALLED' then (case when arrived_at is null then 'WAITING' else 'ARRIVED' end)::ticket_status else status end,
    called_at = case when status = 'CALLED' then null else called_at end,
    counter = case when status = 'CALLED' then null else counter end,
    employee_id = case when status = 'CALLED' then null else employee_id end,
    notified = array(select x from unnest(notified) x where x >= 1000)
  where id = t.id returning * into t;
  perform masar__log(t, 'POSTPONED', prev, 'moved back ' || least(n, cnt));
  select count(*) into ahead from queue_tickets where session_id = t.session_id and status in ('WAITING','ARRIVED')
    and (priority > t.priority or (priority = t.priority and sort_key < t.sort_key));
  perform masar__notify(t, 'POSTPONED', jsonb_build_object('ahead', ahead));
  perform masar__after_change(t.session_id);
  return t;
end $$;

create or replace function public.masar_cancel_ticket(p_ticket uuid) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare t queue_tickets; prev ticket_status;
begin
  t := masar__ticket_for_update(p_ticket);
  if t.user_id is distinct from auth.uid() and not is_business_member(t.business_id) then perform masar_err('forbidden'); end if;
  if t.status not in ('WAITING','ARRIVED','CALLED') then perform masar_err('invalid_state'); end if;
  prev := t.status;
  update queue_tickets set status = 'CANCELLED', ended_at = now() where id = t.id returning * into t;
  perform masar__log(t, 'CANCELLED', prev);
  perform masar__notify(t, 'BOOKING_CANCELLED', jsonb_build_object('by', case when t.user_id = auth.uid() then 'you' else 'business' end));
  perform masar__after_change(t.session_id);
  return t;
end $$;

-- ───────────── staff operations ─────────────
create or replace function public.masar_call_next(p_branch uuid, p_employee uuid default null) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare b business_branches; sess queue_sessions; t queue_tickets; e employees; local_date date;
begin
  select * into b from business_branches where id = p_branch;
  if not found then perform masar_err('not_found'); end if;
  if not is_business_member(b.business_id) then perform masar_err('forbidden'); end if;
  local_date := (now() at time zone b.timezone)::date;
  insert into queue_sessions (branch_id, session_date) values (b.id, local_date) on conflict do nothing;
  select * into sess from queue_sessions where branch_id = b.id and session_date = local_date for update;
  if p_employee is not null then
    select * into e from employees where id = p_employee and branch_id = b.id and active;
  else
    select * into e from employees x where x.branch_id = b.id and x.active
      and not exists (select 1 from queue_tickets q where q.session_id = sess.id and q.status in ('CALLED','IN_SERVICE') and q.counter = x.counter)
      order by x.counter limit 1;
  end if;
  select * into t from queue_tickets q
    where q.session_id = sess.id and q.status in ('WAITING','ARRIVED')
      and (q.slot_start is null or q.slot_start - now() <= interval '10 minutes')
      and (e.id is null or exists (select 1 from employee_services es where es.employee_id = e.id and es.service_id = q.service_id))
    order by q.priority desc, q.sort_key limit 1 for update skip locked;
  if not found then return null; end if;
  update queue_tickets set status = 'CALLED', called_at = now(), counter = coalesce(e.counter, '1'), employee_id = e.id
    where id = t.id returning * into t;
  perform masar__log(t, 'CALLED', 'WAITING');
  perform masar__notify(t, 'CALLED');
  perform masar__after_change(sess.id);
  return t;
end $$;

create or replace function public.masar_staff_transition(p_ticket uuid, p_action text) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare t queue_tickets; prev ticket_status; mins numeric; lt timestamp;
begin
  t := masar__ticket_for_update(p_ticket);
  if not is_business_member(t.business_id) then perform masar_err('forbidden'); end if;
  prev := t.status;
  if p_action = 'start' then
    if t.status not in ('CALLED','ARRIVED') then perform masar_err('invalid_state'); end if;
    update queue_tickets set status = 'IN_SERVICE', started_at = now(), arrived_at = coalesce(arrived_at, now()), called_at = coalesce(called_at, now())
      where id = t.id returning * into t;
    perform masar__log(t, 'STARTED', prev);
  elsif p_action = 'complete' then
    if t.status not in ('IN_SERVICE','CALLED','ARRIVED') then perform masar_err('invalid_state'); end if;
    update queue_tickets set status = 'COMPLETED', ended_at = now(), started_at = coalesce(started_at, now()), arrived_at = coalesce(arrived_at, started_at, now())
      where id = t.id returning * into t;
    lt := t.ended_at at time zone 'Asia/Kuwait';
    insert into service_history (ticket_id, branch_id, service_id, employee_id, waited_min, service_min, weekday, hour)
      values (t.id, t.branch_id, t.service_id, t.employee_id,
              extract(epoch from t.started_at - t.created_at) / 60, extract(epoch from t.ended_at - t.started_at) / 60,
              extract(dow from lt), extract(hour from lt))
      on conflict (ticket_id) do nothing;
    perform masar__log(t, 'COMPLETED', prev);
    perform masar__notify(t, 'SERVICE_COMPLETED');
  elsif p_action = 'skip' then
    if t.status not in ('CALLED','WAITING','ARRIVED') then perform masar_err('invalid_state'); end if;
    update queue_tickets set status = 'SKIPPED' where id = t.id returning * into t;
    perform masar__log(t, 'SKIPPED', prev);
    perform masar__notify(t, 'SKIPPED');
  elsif p_action = 'no_show' then
    if t.status not in ('CALLED','SKIPPED') then perform masar_err('invalid_state'); end if;
    update queue_tickets set status = 'NO_SHOW', ended_at = now() where id = t.id returning * into t;
    perform masar__log(t, 'NO_SHOW', prev);
  elsif p_action = 'recall' then
    if t.status <> 'SKIPPED' then perform masar_err('invalid_state'); end if;
    update queue_tickets set status = case when arrived_at is null then 'WAITING'::ticket_status else 'ARRIVED' end,
      sort_key = extract(epoch from clock_timestamp()) * 1000, called_at = null where id = t.id returning * into t;
    perform masar__log(t, 'RECALLED', prev);
  else
    perform masar_err('invalid_state');
  end if;
  perform masar__after_change(t.session_id);
  return t;
end $$;

-- Healthcare only: clinical staff can prioritise with a logged reason.
create or replace function public.masar_prioritise_ticket(p_ticket uuid, p_reason text) returns queue_tickets
language plpgsql security definer set search_path = public as $$
declare t queue_tickets;
begin
  t := masar__ticket_for_update(p_ticket);
  if not is_business_member(t.business_id) or not is_clinical(t.business_id) then perform masar_err('forbidden'); end if;
  if t.queue_type <> 'healthcare' or t.status not in ('WAITING','ARRIVED') or coalesce(trim(p_reason), '') = '' then perform masar_err('invalid_state'); end if;
  update queue_tickets set priority = true where id = t.id returning * into t;
  perform masar__log(t, 'PRIORITISED', t.status, left(trim(p_reason), 200));
  perform masar__after_change(t.session_id);
  return t;
end $$;

create or replace function public.masar_set_session_status(p_branch uuid, p_status session_status) returns queue_sessions
language plpgsql security definer set search_path = public as $$
declare b business_branches; s queue_sessions;
begin
  select * into b from business_branches where id = p_branch;
  if not is_business_member(b.business_id) then perform masar_err('forbidden'); end if;
  insert into queue_sessions (branch_id, session_date, status) values (b.id, (now() at time zone b.timezone)::date, p_status)
    on conflict (branch_id, session_date) do update set status = excluded.status returning * into s;
  return s;
end $$;

-- ───────────── reviews ─────────────
create or replace function public.masar_submit_review(p_ticket uuid, p_rating int, p_wait int, p_service int, p_body text) returns reviews
language plpgsql security definer set search_path = public as $$
declare t queue_tickets; r reviews;
begin
  select * into t from queue_tickets where id = p_ticket for update;
  if not found then perform masar_err('not_found'); end if;
  if t.user_id is distinct from auth.uid() then perform masar_err('forbidden'); end if;
  if t.status <> 'COMPLETED' or t.reviewed then perform masar_err('review_not_allowed'); end if;
  insert into reviews (ticket_id, user_id, business_id, branch_id, rating, wait_rating, service_rating, body)
    values (t.id, t.user_id, t.business_id, t.branch_id, least(5, greatest(1, p_rating)), least(5, greatest(1, p_wait)), least(5, greatest(1, p_service)), left(coalesce(p_body, ''), 1000))
    returning * into r;
  update queue_tickets set reviewed = true where id = t.id;
  return r;
end $$;

-- ───────────── admin ─────────────
create or replace function public.masar_admin_set_business(p_business uuid, p_status verification_status, p_note text default null) returns businesses
language plpgsql security definer set search_path = public as $$
declare b businesses;
begin
  if not is_admin('businesses.verify') then perform masar_err('forbidden'); end if;
  if p_status = 'suspended' and not exists (select 1 from admin_roles where user_id = auth.uid() and role = 'super_admin') then perform masar_err('forbidden'); end if;
  update businesses set verification = p_status where id = p_business returning * into b;
  if not found then perform masar_err('not_found'); end if;
  insert into audit_logs (actor_id, action, target, note) values (auth.uid(), 'business.' || p_status, b.name_en, p_note);
  return b;
end $$;

create or replace function public.masar_admin_set_user_status(p_user uuid, p_status account_status, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin('users.suspend') or p_user = auth.uid() then perform masar_err('forbidden'); end if;
  update users set status = p_status where id = p_user;
  insert into audit_logs (actor_id, action, target, note) values (auth.uid(), case when p_status = 'suspended' then 'user.suspended' else 'user.reactivated' end, p_user::text, p_note);
end $$;

create or replace function public.masar_admin_set_review_hidden(p_review uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin('reviews.moderate') then perform masar_err('forbidden'); end if;
  update reviews set hidden = p_hidden where id = p_review;
  insert into audit_logs (actor_id, action, target) values (auth.uid(), case when p_hidden then 'review.hidden' else 'review.restored' end, p_review::text);
end $$;

create or replace function public.masar_admin_set_report_status(p_report uuid, p_status report_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin('reports.manage') then perform masar_err('forbidden'); end if;
  update reports set status = p_status where id = p_report;
  insert into audit_logs (actor_id, action, target) values (auth.uid(), 'report.' || p_status, p_report::text);
end $$;

-- Profile row is created on first sign-in.
create or replace function public.masar__handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into users (id, full_name, locale) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'MASAR user'), coalesce(new.raw_user_meta_data ->> 'locale', 'ar'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.masar__handle_new_user();
