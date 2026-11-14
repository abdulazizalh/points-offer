// Demo-mode helpers: populate today's queues with clearly-flagged demo customers
// and a small simulator that moves queues forward so the app can be explored
// without a live business on the other side. Never used in Supabase mode.
import type { DB, Ticket } from "./types";
import { branchHistory } from "./intelligence";
import { callNext, completeService, confirmArrival, createTicket, ensureSession, lineFor, nowServing, startService } from "./engine";
import { hashString, isBranchOpen, kuwaitDate, kuwaitParts, mulberry32 } from "./utils";

const SYSTEM = { id: null, role: "system" as const };
const GUESTS = ["Guest", "زائر"];

/** Create today's sessions for open demo branches with a realistic starting state. */
export function ensureDemoToday(db: DB, now = Date.now()): boolean {
  const date = kuwaitDate(now);
  let changed = false;
  for (const branch of db.branches) {
    const biz = db.businesses.find((b) => b.id === branch.businessId);
    if (!biz?.isDemo || biz.verification !== "verified" || !branch.active) continue;
    if (db.sessions.some((s) => s.branchId === branch.id && s.date === date)) continue;
    const session = ensureSession(db, branch.id, now);
    changed = true;
    const services = db.services.filter((s) => s.branchIds.includes(branch.id) && s.active);
    if (!services.length) continue;
    const rand = mulberry32(hashString(branch.id + date));
    const qt = services[0].queueType ?? branch.queueType;
    if (qt === "timed_entry" || qt === "appointment") {
      // pre-book some slots
      continue;
    }
    if (!isBranchOpen(branch, now)) continue;
    const hist = branchHistory(db, branch.id);
    const p = kuwaitParts(now);
    const intensity = hist.byWeekdayHour[p.day][p.h] || 1;
    const waiting = Math.min(14, Math.max(1, Math.round(intensity * (0.8 + rand() * 0.8))));
    const served = 6 + Math.floor(rand() * 20);
    // historical numbers already served today
    for (const s of services) session.seqByPrefix[s.prefix] = Math.floor(served / services.length);
    const make = (minsAgo: number, i: number) => {
      const svc = services[Math.floor(rand() * services.length)];
      const channel = qt === "walk_in" || !branch.remoteBooking ? "walk_in" : "remote";
      const r = createTicket(db, SYSTEM, { branchId: branch.id, serviceId: svc.id, channel, guestLabel: `${GUESTS[0]} ${i + 1}` }, now - minsAgo * 60e3);
      return r.ok ? r.data : null;
    };
    // in service at each counter
    const counters = db.employees.filter((e) => e.branchId === branch.id && e.active).length;
    for (let i = 0; i < counters; i++) {
      const t = make(25 + i * 4, i);
      if (!t) continue;
      t.arrivedAt = t.createdAt + 10 * 60e3;
      const c = callNext(db, SYSTEM, branch.id, {}, now - (8 + i * 3) * 60e3);
      if (c.ok && c.data) startService(db, SYSTEM, c.data.id, now - (7 + i * 3) * 60e3);
    }
    for (let i = 0; i < waiting; i++) {
      const t = make(Math.max(1, 20 - i * 1.5), counters + i);
      if (t && rand() < 0.35) {
        t.arrivedAt = now - Math.floor(rand() * 5) * 60e3;
        t.status = "ARRIVED";
      }
    }
  }
  return changed;
}

/**
 * One simulator step. Completes service that has run long enough, calls the next
 * customer when a counter is free, and admits demo customers (not the real user)
 * when they're called. The real user's ticket only proceeds after they confirm
 * arrival, or after a grace period it waits for staff (no auto no-show).
 */
export function simulateTick(db: DB, now = Date.now(), speed = 1): boolean {
  let changed = false;
  const date = kuwaitDate(now);
  for (const session of db.sessions.filter((s) => s.date === date && s.status === "open")) {
    const branch = db.branches.find((b) => b.id === session.branchId);
    const biz = branch && db.businesses.find((b) => b.id === branch.businessId);
    if (!branch || !biz?.isDemo) continue;
    const hasUser = db.tickets.some((t) => t.sessionId === session.id && t.userId && ["WAITING", "ARRIVED", "CALLED", "IN_SERVICE"].includes(t.status));
    // Busy-but-not-watched branches move slowly; branches with the user's ticket move every tick.
    if (!hasUser && Math.random() > 0.15) continue;
    const serving = nowServing(db, branch.id, now);
    for (const t of serving) {
      if (t.status === "IN_SERVICE") {
        const svc = db.services.find((s) => s.id === t.serviceId);
        const needed = ((svc?.durationMin ?? 10) * 60e3) / (speed * 12); // compressed demo time
        if (now - (t.startedAt ?? now) >= needed) {
          completeService(db, SYSTEM, t.id, now);
          changed = true;
        }
      } else if (t.status === "CALLED") {
        if (!t.userId) {
          startService(db, SYSTEM, t.id, now);
          changed = true;
        } else if (t.arrivedAt) {
          startService(db, SYSTEM, t.id, now);
          changed = true;
        }
      }
    }
    const counters = db.employees.filter((e) => e.branchId === branch.id && e.active).length || 1;
    const busy = nowServing(db, branch.id, now).length;
    if (busy < counters) {
      const r = callNext(db, SYSTEM, branch.id, {}, now);
      if (r.ok && r.data) changed = true;
    }
    // Demo customers who are about to be called show up on-site.
    const line = lineFor(db, session.id);
    for (const t of line.slice(0, 3)) {
      if (!t.userId && !t.arrivedAt && Math.random() < 0.6) {
        confirmArrival(db, SYSTEM, t.id, undefined, now);
        changed = true;
      }
    }
    // Occasional new walk-in so queues don't drain to zero.
    if (isBranchOpen(branch, now) && line.length < 4 && Math.random() < 0.25) {
      const svcs = db.services.filter((s) => s.branchIds.includes(branch.id) && s.active && !(s.queueType === "timed_entry" || s.queueType === "appointment"));
      const svc = svcs[Math.floor(Math.random() * svcs.length)];
      if (svc) {
        const channel = (svc.queueType ?? branch.queueType) === "walk_in" || !branch.remoteBooking ? "walk_in" : "remote";
        const r = createTicket(db, SYSTEM, { branchId: branch.id, serviceId: svc.id, channel, guestLabel: GUESTS[0] }, now);
        if (r.ok) changed = true;
      }
    }
  }
  return changed;
}

/** Trim old demo data so local storage stays small. */
export function compactDemo(db: DB, now = Date.now()) {
  const cutoff = now - 14 * 864e5;
  const keep = (t: Ticket) => t.userId !== null || t.createdAt > now - 864e5;
  db.tickets = db.tickets.filter((t) => keep(t) && t.createdAt > cutoff);
  const ids = new Set(db.tickets.map((t) => t.id));
  db.events = db.events.filter((e) => ids.has(e.ticketId) || e.at > now - 864e5).slice(-4000);
  const sessionIds = new Set(db.tickets.map((t) => t.sessionId));
  const today = kuwaitDate(now);
  db.sessions = db.sessions.filter((s) => s.date === today || sessionIds.has(s.id));
  db.notifications = db.notifications.slice(-300);
  db.audit = db.audit.slice(-500);
}
