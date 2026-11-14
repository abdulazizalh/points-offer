# MASAR architecture

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL, Auth, Realtime) · Recharts · lucide icons · PWA (manifest + service worker).

## Layout
```
src/
  app/(app)/…            customer PWA (mobile frame, bottom nav)
  app/business/…         business dashboard
  app/display/[branchId] public TV display
  app/admin/[[...section]] admin console (RBAC)
  app/api/notify         server-side SMS / WhatsApp fan-out (env-gated)
  components/            design system (ui.tsx), domain widgets, shells
  lib/
    types.ts             domain model (mirrors SQL)
    engine.ts            queue rules — single source of truth on the client
    intelligence.ts      wait prediction, crowd alerts, best time to visit
    demo.ts              demo seeding + simulator (demo only)
    store.tsx            data layer: localStorage + BroadcastChannel sync, toasts, i18n
    i18n.ts              Arabic + English dictionaries
    seed.ts              fictional Kuwait demo dataset
supabase/
  migrations/0001_schema.sql        tables, enums, constraints, indexes
  migrations/0002_queue_engine.sql  SECURITY DEFINER functions (masar_*)
  migrations/0003_rls.sql           Row Level Security + realtime publication
  seed.sql                          categories
  tests/                            plain-Postgres test harness (auth shim + behavioural tests)
```

## Queue engine rules (implemented in both `engine.ts` and SQL)
- **Statuses:** WAITING → (ARRIVED) → CALLED → IN_SERVICE → COMPLETED; or CANCELLED / SKIPPED / NO_SHOW. Every change writes a `queue_events` row.
- **Numbering:** per branch, per day (`queue_sessions`), per service prefix: `A-001`… The session row is locked `FOR UPDATE` during creation, and `(session_id, number)` is unique → transaction-safe.
- **One active ticket per customer per branch:** partial unique index.
- **Postpone:** once per ticket, moves back `postpone_positions` places (business setting) or to the end. Never moves anyone back, never jumps ahead. Disabled for timed-entry/appointments.
- **Cancel:** owner or staff, before service starts.
- **Arrival:** customer must enter/scan the rotating on-site code (HMAC of a branch secret, 5-min window, previous window accepted). Staff can confirm by scanning the ticket QR. The secret column is not readable by API roles.
- **Healthcare:** only staff flagged `clinical` can prioritise, a reason is mandatory and logged. Customers never choose priority.
- **Queue types:** standard, walk-in (staff-created / on-site QR only), appointment and timed entry (slots with capacity), healthcare.
- **Notifications:** booking confirmed, five ahead, approaching (user threshold), next, confirm arrival, called, postponed, skipped, cancelled, completed. Each records per-channel delivery state.

## Intelligence
- **Wait estimate:** Σ(avg service minutes of people ahead) + remaining time of tickets in service, ÷ active staff for the service, × peak-hour factor. Average service time blends the configured duration with history (`w = n/(n+20)`). Output is a **range**, widened when history is thin.
- **Crowd alerts** (business overview): surge vs. usual arrivals, unusually slow service, long tail wait, near capacity, no staff while open.
- **Best time to visit:** hourly arrival profile for today's weekday, tertiles → Low/Medium/High. Hidden below 200 historical visits.

## Security
- RLS on every table. Customers see their own tickets/notifications; business members only their business; admins act via audited functions.
- All queue writes go through `masar_*` functions — no direct inserts/updates on `queue_tickets`.
- Admin RBAC: super_admin / moderator / support permission matrix, enforced in SQL (`is_admin(perm)`) and mirrored in the UI. Every admin action writes `audit_logs`.
- `/api/notify` only sends to the **authenticated user's own** phone, resolved server-side; secrets are server env only.
- No Civil ID or payment data is collected.

## Going live (not done yet)
1. Create a Supabase project; run `supabase/migrations/*` and `seed.sql`.
2. **Supabase data adapter for the UI** — implement a store backed by the `masar_*` RPCs + Realtime subscriptions on `queue_tickets`/`notifications`, exposing the same API as `lib/store.tsx`, then set `DATA_MODE` from env in `lib/config.ts`. Auth calls in `lib/auth.ts` already have Supabase branches.
3. Configure Supabase phone auth (SMS provider), FCM web push, and optionally Twilio/WhatsApp env vars.
4. Add a Google Maps key restricted by HTTP referrer.
5. Legal review of `lib/legal.ts` text; pilot with 2–3 real establishments.
