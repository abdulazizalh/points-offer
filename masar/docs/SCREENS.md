# Screen inventory

## Customer PWA
| Screen | Route |
|---|---|
| Splash | `/` |
| Onboarding (3 slides) | `/onboarding` |
| Login (phone OTP / email+password) · Sign up · OTP · Forgot · Reset | `/auth/login` `/auth/signup` `/auth/otp` `/auth/forgot` `/auth/reset` |
| Terms · Privacy | `/legal/terms` `/legal/privacy` |
| Home | `/home` |
| Explore (list + map, filters, sort) | `/explore` |
| Search · no results | `/search` |
| Establishment details | `/place/[branchId]` |
| Service selection (remote / on-site) | `/place/[branchId]/services` |
| Booking confirmation (slots for timed entry/appointments, on-site code) | `/book/[branchId]/[serviceId]` |
| Booking success | `/booking-success/[ticketId]` |
| My Queue (active tickets / empty) | `/queue` |
| Digital ticket (live, arrival, postpone, cancel, called, completed, cancelled, skipped, no-show states) | `/queue/[ticketId]` |
| Notifications · settings | `/notifications` `/notifications/settings` |
| Queue history (active / completed / cancelled) | `/history` |
| Rate & review | `/review/[ticketId]` |
| Favorites | `/favorites` |
| Profile · edit · saved locations · privacy | `/profile` `/profile/edit` `/profile/locations` `/profile/privacy` |
| Help center / FAQ · contact support | `/help` `/help/contact` |
| Offline · 404 · error | `/offline`, `not-found`, `error` |

## Business
Login / demo login · Register (pending verification) · Overview (KPIs, alerts, live snapshot, reviews) · Live Queue · Services · Employees · Branches (hours, policy, check-in QR) · Analytics · TV display `/display/[branchId]`.

## Admin
Role sign-in · Overview (KPIs, live activity, tickets by category) · Businesses (verify/reject/suspend) · Users (suspend) · Categories · Reports · Reviews (hide/restore) · Audit log.
