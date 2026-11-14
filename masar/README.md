# MASAR · مَسار — Your Time. Your Turn.

Smart queue management for Kuwait (GCC next). One codebase for:

| Surface | Route | Who |
|---|---|---|
| Customer PWA (Arabic RTL / English LTR) | `/` → `/home` | End users |
| Business dashboard | `/business` | Owners & staff |
| Waiting-room TV display | `/display/<branchId>` | Public screen in the branch |
| Platform admin console | `/admin` | Super admin / moderator / support |

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # queue engine + intelligence unit tests (vitest)
npm run test:sql     # applies supabase/migrations to a throwaway local Postgres and runs SQL tests
npm run build
```

### Try the full journey (demo mode)
1. Open `/`, go through onboarding, **create an account** with any Kuwaiti mobile (e.g. `55512345`). The demo OTP is `123456` (shown on screen — no SMS is sent).
2. Pick a place → service → **Confirm & Get My Number**. Your live ticket appears under **My Queue**.
3. In another tab open `/business` → **Open demo business** → **Live Queue**. Confirm arrival, call, start and complete your ticket — the customer tab updates instantly (tabs sync through `BroadcastChannel`).
4. Back in the customer tab: rate the visit. Check `/admin` to verify businesses, moderate reviews and read the audit log.
5. The **queue simulator** (Profile → Demo tools) moves demo queues forward automatically. It never confirms *your* arrival for you.

Arrival from the customer app needs the rotating 6-character code shown on `/display/<branchId>` (or the business Live Queue page) — this blocks "I'm here" taps from home.

## Demo vs production

Everything you see in the UI today is **demo data** and is labelled as such (banner, "Demo" badges, TV footer). Establishments are fictional.

- No SMS / WhatsApp / push is faked. The notification settings show **Not connected** until the operator configures the channel; push uses the browser Notification API only after permission.
- No Google Maps key → a schematic map labelled as a demo preview. Directions links open real Google Maps.
- Historical charts and best-time-to-visit use synthetic history for demo businesses; a new business shows "Not enough history yet".

The production backend lives in `supabase/` (schema, server-side queue engine, RLS) and is tested on real PostgreSQL. See `docs/ARCHITECTURE.md` for what's left to go live.

## Docs
- `docs/ARCHITECTURE.md` — system design, queue rules, data model, security, going-live checklist
- `docs/SCREENS.md` — screen inventory and routes
- `.env.example` — every configuration value (no secrets committed)
