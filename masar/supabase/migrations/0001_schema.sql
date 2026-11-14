-- MASAR · core schema
-- PostgreSQL 15+ / Supabase. Mirrors src/lib/types.ts.

create extension if not exists pgcrypto;

-- ───────────── enums ─────────────
create type public.user_role as enum ('customer', 'business_owner', 'business_staff', 'admin');
create type public.admin_role as enum ('super_admin', 'moderator', 'support');
create type public.account_status as enum ('active', 'suspended');
create type public.queue_type as enum ('standard', 'appointment', 'timed_entry', 'walk_in', 'healthcare');
create type public.verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type public.ticket_status as enum ('WAITING', 'CALLED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'SKIPPED');
create type public.ticket_channel as enum ('remote', 'onsite_qr', 'walk_in');
create type public.session_status as enum ('open', 'paused', 'closed');
create type public.queue_event_type as enum ('CREATED', 'ARRIVED', 'CALLED', 'STARTED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'SKIPPED', 'POSTPONED', 'PRIORITISED', 'RECALLED');
create type public.notification_type as enum ('BOOKING_CONFIRMED', 'QUEUE_UPDATED', 'TURN_APPROACHING', 'FIVE_AHEAD', 'TURN_NEXT', 'CONFIRM_ARRIVAL', 'CALLED', 'BOOKING_CANCELLED', 'SERVICE_COMPLETED', 'POSTPONED', 'SKIPPED');
create type public.report_kind as enum ('complaint', 'review_flag', 'abuse', 'bug');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

-- ───────────── users ─────────────
-- One profile per Supabase Auth user. Phone comes from auth.users (OTP verified).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  email text,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  avatar_hue int not null default 210,
  show_first_name boolean not null default true,
  prefs jsonb not null default '{"push": false, "sms": false, "whatsapp": false, "approachingAt": 3}',
  created_at timestamptz not null default now()
);

create table public.admin_roles (
  user_id uuid primary key references public.users (id) on delete cascade,
  role public.admin_role not null,
  granted_by uuid references public.users (id),
  granted_at timestamptz not null default now()
);

create table public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  label text not null check (char_length(label) <= 30),
  area_id text not null,
  created_at timestamptz not null default now()
);

-- ───────────── catalogue ─────────────
create table public.service_categories (
  id text primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  icon text not null,
  default_queue_type public.queue_type not null default 'standard',
  active boolean not null default true,
  sort int not null default 0
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  category_id text not null references public.service_categories (id),
  owner_id uuid not null references public.users (id),
  hue int not null default 212,
  initials text not null default 'MB',
  phone text,
  email text,
  cr_number text not null,
  verification public.verification_status not null default 'pending',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Who can operate a business (owner + staff). Clinical staff may set medical priority.
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.user_role not null check (role in ('business_owner', 'business_staff')),
  clinical boolean not null default false,
  primary key (business_id, user_id)
);

create table public.business_branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  area_id text not null,
  address_en text not null default '',
  address_ar text not null default '',
  lat double precision not null,
  lng double precision not null,
  phone text,
  active boolean not null default true,
  queue_type public.queue_type not null default 'standard',
  remote_booking boolean not null default true,
  allow_postpone boolean not null default true,
  postpone_positions int not null default 3 check (postpone_positions between 1 and 20),
  max_queue int not null default 60 check (max_queue between 1 and 500),
  slot_minutes int check (slot_minutes between 5 and 480),
  slot_capacity int check (slot_capacity >= 1),
  timezone text not null default 'Asia/Kuwait',
  checkin_secret bytea not null default gen_random_bytes(32), -- never exposed to clients
  created_at timestamptz not null default now()
);

create table public.business_operating_hours (
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  day smallint not null check (day between 0 and 6), -- 0 = Sunday
  open_time time not null,
  close_time time not null,
  closed boolean not null default false,
  primary key (branch_id, day)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  duration_min int not null check (duration_min between 1 and 480),
  prefix text not null check (prefix ~ '^[A-Z]{1,2}$'),
  active boolean not null default true,
  remote_booking boolean not null default true,
  queue_type public.queue_type, -- null = branch default
  max_queue int check (max_queue >= 1),
  created_at timestamptz not null default now()
);

create table public.service_branches (
  service_id uuid not null references public.services (id) on delete cascade,
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  primary key (service_id, branch_id)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  name text not null,
  title_en text not null default '',
  title_ar text not null default '',
  counter text not null default '1',
  active boolean not null default true,
  clinical boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.employee_services (
  employee_id uuid not null references public.employees (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (employee_id, service_id)
);

-- ───────────── queue ─────────────
create table public.queue_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  session_date date not null,
  status public.session_status not null default 'open',
  seq_by_prefix jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (branch_id, session_date)
);

create table public.queue_tickets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.queue_sessions (id) on delete cascade,
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null references public.services (id),
  user_id uuid references public.users (id) on delete set null,
  guest_label text check (char_length(guest_label) <= 40),
  number text not null,
  sort_key double precision not null,
  status public.ticket_status not null default 'WAITING',
  channel public.ticket_channel not null,
  queue_type public.queue_type not null,
  postponed boolean not null default false,
  priority boolean not null default false,
  employee_id uuid references public.employees (id) on delete set null,
  counter text,
  slot_start timestamptz,
  estimate_low int not null default 0,
  estimate_high int not null default 0,
  notified int[] not null default '{}',
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  arrived_at timestamptz,
  called_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  unique (session_id, number)
);

-- A customer may hold only one active ticket per branch.
create unique index queue_tickets_one_active_per_branch
  on public.queue_tickets (user_id, branch_id)
  where user_id is not null and status in ('WAITING', 'ARRIVED', 'CALLED', 'IN_SERVICE');

create index queue_tickets_line_idx on public.queue_tickets (session_id, priority desc, sort_key) where status in ('WAITING', 'ARRIVED');
create index queue_tickets_user_idx on public.queue_tickets (user_id, created_at desc);
create index queue_tickets_slot_idx on public.queue_tickets (branch_id, service_id, slot_start) where slot_start is not null;

-- Append-only history of every status change.
create table public.queue_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.queue_tickets (id) on delete cascade,
  session_id uuid not null references public.queue_sessions (id) on delete cascade,
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  type public.queue_event_type not null,
  from_status public.ticket_status,
  to_status public.ticket_status,
  actor_id uuid,
  actor_role text not null,
  note text check (char_length(note) <= 200),
  at timestamptz not null default now()
);
create index queue_events_ticket_idx on public.queue_events (ticket_id, at);

-- Completed service durations feed the waiting-time predictor.
create table public.service_history (
  id bigint generated always as identity primary key,
  ticket_id uuid not null unique references public.queue_tickets (id) on delete cascade,
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  waited_min numeric not null,
  service_min numeric not null,
  weekday smallint not null,
  hour smallint not null,
  completed_at timestamptz not null default now()
);
create index service_history_branch_idx on public.service_history (branch_id, service_id, completed_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ticket_id uuid references public.queue_tickets (id) on delete cascade,
  type public.notification_type not null,
  vars jsonb not null default '{}',
  read boolean not null default false,
  delivery jsonb not null default '{"inApp": "delivered"}',
  at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.queue_tickets (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  branch_id uuid not null references public.business_branches (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  wait_rating smallint not null check (wait_rating between 1 and 5),
  service_rating smallint not null check (service_rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  hidden boolean not null default false,
  at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('branch', 'service')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  kind public.report_kind not null,
  business_id uuid references public.businesses (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  user_id uuid references public.users (id) on delete set null,
  body text not null check (char_length(body) <= 2000),
  status public.report_status not null default 'open',
  at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target text not null,
  note text,
  at timestamptz not null default now()
);
