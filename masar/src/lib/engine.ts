// MASAR queue engine. Single source of truth for queue rules.
// In demo mode it runs in the browser against the local store; in production the
// same rules are enforced by the PL/pgSQL functions in /supabase/migrations
// (masar_create_ticket, masar_postpone_ticket, ...). Keep both in sync.
import type {
  Actor,
  AdminRole,
  AppNotification,
  Branch,
  Business,
  Category,
  DB,
  Employee,
  ErrorCode,
  NotificationType,
  QueueEventType,
  QueueSession,
  QueueType,
  Result,
  Service,
  Ticket,
  TicketChannel,
  TicketStatus,
  User,
} from "./types";
import { ACTIVE_STATUSES } from "./types";
import { estimateWait } from "./intelligence";
import { isBranchOpen, kuwaitDate, uid, verifyCheckinCode } from "./utils";

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (error: ErrorCode): Result<never> => ({ ok: false, error });

// ───────────────────────── permissions ─────────────────────────

export type Permission =
  | "users.view"
  | "users.suspend"
  | "businesses.view"
  | "businesses.verify"
  | "categories.manage"
  | "reviews.moderate"
  | "reports.manage"
  | "audit.view"
  | "analytics.view";

export const ADMIN_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ["users.view", "users.suspend", "businesses.view", "businesses.verify", "categories.manage", "reviews.moderate", "reports.manage", "audit.view", "analytics.view"],
  moderator: ["users.view", "businesses.view", "businesses.verify", "reviews.moderate", "reports.manage", "analytics.view"],
  support: ["users.view", "businesses.view", "reports.manage"],
};

export function can(actor: Actor, p: Permission): boolean {
  return actor.role === "admin" && !!actor.adminRole && ADMIN_PERMISSIONS[actor.adminRole].includes(p);
}

export function isStaffOf(actor: Actor, businessId: string): boolean {
  return (actor.role === "business_owner" || actor.role === "business_staff") && actor.businessId === businessId;
}

export function actorFor(user: User | undefined | null): Actor {
  if (!user) return { id: null, role: "system" };
  return { id: user.id, role: user.role, adminRole: user.adminRole, businessId: user.businessId };
}

const SYSTEM: Actor = { id: null, role: "system" };

// ───────────────────────── queue helpers ─────────────────────────

export function queueTypeOf(branch: Branch, service: Service): QueueType {
  return service.queueType ?? branch.queueType;
}

export function ensureSession(db: DB, branchId: string, now = Date.now()): QueueSession {
  const date = kuwaitDate(now);
  let s = db.sessions.find((x) => x.branchId === branchId && x.date === date);
  if (!s) {
    s = { id: uid("ses"), branchId, date, status: "open", seqByPrefix: {} };
    db.sessions.push(s);
  }
  return s;
}

function byLineOrder(a: Ticket, b: Ticket) {
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  return a.sortKey - b.sortKey;
}

/** Customers still in line (not yet called), in serving order. */
export function lineFor(db: DB, sessionId: string): Ticket[] {
  return db.tickets.filter((t) => t.sessionId === sessionId && (t.status === "WAITING" || t.status === "ARRIVED")).sort(byLineOrder);
}

/** Line for a branch today. Timed-entry / appointment tickets only count once their slot is near. */
export function branchLine(db: DB, branchId: string, now = Date.now()): Ticket[] {
  const s = db.sessions.find((x) => x.branchId === branchId && x.date === kuwaitDate(now));
  return s ? lineFor(db, s.id) : [];
}

export function peopleAhead(db: DB, ticket: Ticket): number {
  if (ticket.status !== "WAITING" && ticket.status !== "ARRIVED") return 0;
  const line = lineFor(db, ticket.sessionId);
  const sameFlow = line.filter((t) => t.queueType === ticket.queueType || (t.queueType !== "timed_entry" && ticket.queueType !== "timed_entry"));
  const idx = sameFlow.findIndex((t) => t.id === ticket.id);
  return idx < 0 ? 0 : idx;
}

export function ticketEstimate(db: DB, ticket: Ticket, now = Date.now()) {
  const line = lineFor(db, ticket.sessionId);
  const idx = line.findIndex((t) => t.id === ticket.id);
  return estimateWait(db, ticket.branchId, ticket.serviceId, idx < 0 ? [] : line.slice(0, idx), now);
}

export function nowServing(db: DB, branchId: string, now = Date.now()): Ticket[] {
  const s = db.sessions.find((x) => x.branchId === branchId && x.date === kuwaitDate(now));
  if (!s) return [];
  return db.tickets
    .filter((t) => t.sessionId === s.id && (t.status === "CALLED" || t.status === "IN_SERVICE"))
    .sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0));
}

function logEvent(db: DB, ticket: Ticket, type: QueueEventType, actor: Actor, from: TicketStatus | undefined, now: number, note?: string) {
  db.events.push({
    id: uid("evt"),
    ticketId: ticket.id,
    sessionId: ticket.sessionId,
    branchId: ticket.branchId,
    type,
    from,
    to: ticket.status,
    actorId: actor.id,
    actorRole: actor.role,
    at: now,
    note,
  });
}

function transition(db: DB, ticket: Ticket, to: TicketStatus, type: QueueEventType, actor: Actor, now: number, note?: string) {
  const from = ticket.status;
  ticket.status = to;
  logEvent(db, ticket, type, actor, from, now, note);
}

export function notify(db: DB, userId: string | null, type: NotificationType, vars: AppNotification["vars"], ticketId: string | undefined, now: number) {
  if (!userId) return;
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  db.notifications.push({
    id: uid("ntf"),
    userId,
    ticketId,
    type,
    vars,
    at: now,
    read: false,
    delivery: {
      inApp: "delivered",
      push: user.prefs.push ? "pending" : "not_enabled",
      sms: user.prefs.sms ? "pending" : "not_enabled",
      whatsapp: user.prefs.whatsapp ? "pending" : "not_enabled",
    },
  });
}

function ticketVars(db: DB, t: Ticket): Record<string, string | number> {
  const b = db.businesses.find((x) => x.id === t.businessId);
  return { ticket: t.number, placeEn: b?.name.en ?? "", placeAr: b?.name.ar ?? "", counter: t.counter ?? "" };
}

/** Emit threshold notifications after any change that can move people forward. */
export function afterQueueChange(db: DB, sessionId: string, now: number) {
  const line = lineFor(db, sessionId);
  line.forEach((t, ahead) => {
    if (!t.userId) return;
    const user = db.users.find((u) => u.id === t.userId);
    const approach = user?.prefs.approachingAt ?? 3;
    const vars = { ...ticketVars(db, t), ahead };
    const fire = (key: number, type: NotificationType) => {
      if (t.notified.includes(key)) return false;
      t.notified.push(key);
      notify(db, t.userId, type, vars, t.id, now);
      return true;
    };
    if (ahead === 0) fire(0, "TURN_NEXT");
    else if (ahead <= approach && ahead !== 5) fire(100 + approach, "TURN_APPROACHING");
    if (ahead === 5) fire(5, "FIVE_AHEAD");
    if (ahead <= 2 && !t.arrivedAt) fire(200, "CONFIRM_ARRIVAL");
    if (ahead > 5 && ahead % 10 === 0) fire(1000 + ahead, "QUEUE_UPDATED");
  });
}

// ───────────────────────── customer operations ─────────────────────────

export interface CreateTicketInput {
  branchId: string;
  serviceId: string;
  channel: TicketChannel;
  slotStart?: number;
  checkinCode?: string;
  guestLabel?: string;
}

export function slotsFor(db: DB, branch: Branch, service: Service, now = Date.now()) {
  const minutes = branch.slotMinutes ?? 30;
  const cap = branch.slotCapacity ?? 10;
  const date = kuwaitDate(now);
  const today = branch.hours.find((h) => h.day === new Date(now + 3 * 3600e3).getUTCDay());
  if (!today || today.closed) return [];
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  const start = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), oh - 3, om);
  let end = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), ch - 3, cm);
  if (end <= start) end += 864e5;
  const out: Array<{ start: number; booked: number; capacity: number; past: boolean }> = [];
  for (let t = start; t + minutes * 60e3 <= end; t += minutes * 60e3) {
    const booked = db.tickets.filter((x) => x.branchId === branch.id && x.serviceId === service.id && x.slotStart === t && x.status !== "CANCELLED").length;
    out.push({ start: t, booked, capacity: cap, past: t + minutes * 60e3 < now });
  }
  return out;
}

export function createTicket(db: DB, actor: Actor, input: CreateTicketInput, now = Date.now()): Result<Ticket> {
  const branch = db.branches.find((b) => b.id === input.branchId);
  const service = db.services.find((s) => s.id === input.serviceId);
  if (!branch || !service || !service.branchIds.includes(branch.id)) return fail("not_found");
  const business = db.businesses.find((b) => b.id === branch.businessId)!;
  if (business.verification !== "verified") return fail("not_verified");
  const user = actor.id ? db.users.find((u) => u.id === actor.id) : undefined;
  if (user?.status === "suspended") return fail("account_suspended");

  const staff = isStaffOf(actor, business.id);
  if (input.channel === "walk_in" && !staff && actor.role !== "system") return fail("forbidden");
  if (input.channel !== "walk_in" && actor.role !== "customer" && actor.role !== "system") return fail("forbidden");
  if (!branch.active || !service.active) return fail("branch_closed");

  const qt = queueTypeOf(branch, service);
  const slotted = qt === "timed_entry" || qt === "appointment";
  if (!slotted && !isBranchOpen(branch, now)) return fail("branch_closed");
  if (input.channel === "remote" && (!branch.remoteBooking || !service.remoteBooking || qt === "walk_in")) return fail("remote_booking_disabled");
  if (input.channel === "onsite_qr" && (!input.checkinCode || !verifyCheckinCode(branch.checkinSecret, input.checkinCode, now))) return fail("invalid_checkin_code");

  if (actor.role === "customer" && actor.id) {
    const dup = db.tickets.find((t) => t.userId === actor.id && t.branchId === branch.id && ACTIVE_STATUSES.includes(t.status));
    if (dup) return fail("duplicate_active_ticket");
  }

  const session = ensureSession(db, branch.id, now);
  if (session.status !== "open") return fail("branch_closed");
  const line = lineFor(db, session.id);
  const limit = service.maxQueue ?? branch.maxQueue;
  if (!slotted && line.length >= limit) return fail("queue_full");

  let slotStart: number | undefined;
  if (slotted) {
    const slots = slotsFor(db, branch, service, now);
    const slot = slots.find((s) => s.start === input.slotStart);
    if (!slot || slot.past) return fail("invalid_state");
    if (slot.booked >= slot.capacity) return fail("slot_full");
    slotStart = slot.start;
  }

  const seq = (session.seqByPrefix[service.prefix] ?? 0) + 1;
  session.seqByPrefix[service.prefix] = seq;
  const estimate = estimateWait(db, branch.id, service.id, line, now);
  const ticket: Ticket = {
    id: uid("tkt"),
    sessionId: session.id,
    branchId: branch.id,
    businessId: business.id,
    serviceId: service.id,
    userId: input.channel === "walk_in" ? null : actor.id,
    guestLabel: input.guestLabel,
    number: `${service.prefix}-${String(seq).padStart(3, "0")}`,
    sortKey: slotStart ?? now,
    status: "WAITING",
    channel: input.channel,
    queueType: qt,
    createdAt: now,
    postponed: false,
    priority: false,
    estimateAtBooking: [estimate.low, estimate.high],
    notified: [],
    reviewed: false,
    isDemo: business.isDemo,
    slotStart,
  };
  if (input.channel === "onsite_qr" || input.channel === "walk_in") {
    ticket.arrivedAt = now;
    ticket.status = "ARRIVED";
  }
  db.tickets.push(ticket);
  logEvent(db, ticket, "CREATED", actor, undefined, now, input.channel);
  notify(db, ticket.userId, "BOOKING_CONFIRMED", { ...ticketVars(db, ticket), low: estimate.low, high: estimate.high }, ticket.id, now);
  if (ticket.userId && !db.recentBranchIds.includes(branch.id)) db.recentBranchIds = [branch.id, ...db.recentBranchIds].slice(0, 8);
  else if (ticket.userId) db.recentBranchIds = [branch.id, ...db.recentBranchIds.filter((x) => x !== branch.id)].slice(0, 8);
  afterQueueChange(db, session.id, now);
  return ok(ticket);
}

function getTicket(db: DB, id: string) {
  return db.tickets.find((t) => t.id === id);
}

function ownsOrStaff(actor: Actor, t: Ticket) {
  return (actor.id !== null && t.userId === actor.id) || isStaffOf(actor, t.businessId) || actor.role === "system";
}

/**
 * Confirm arrival. Customers must present the rotating on-site code (shown only on
 * the in-branch display / QR), which prevents confirming arrival from home.
 * Staff can confirm by scanning the customer's ticket QR.
 */
export function confirmArrival(db: DB, actor: Actor, ticketId: string, code: string | undefined, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  if (!ownsOrStaff(actor, t)) return fail("forbidden");
  if (!["WAITING", "CALLED"].includes(t.status) || t.arrivedAt) return fail("invalid_state");
  const staff = isStaffOf(actor, t.businessId) || actor.role === "system";
  if (!staff) {
    const branch = db.branches.find((b) => b.id === t.branchId)!;
    if (!code || !verifyCheckinCode(branch.checkinSecret, code, now)) return fail("invalid_checkin_code");
  }
  t.arrivedAt = now;
  if (t.status === "WAITING") transition(db, t, "ARRIVED", "ARRIVED", actor, now);
  else logEvent(db, t, "ARRIVED", actor, t.status, now);
  return ok(t);
}

/**
 * Postpone once per ticket. The ticket moves back `branch.postponePositions`
 * places (or to the end of the line). It can never move ahead of anyone.
 */
export function postponeTicket(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  if (actor.id === null || t.userId !== actor.id) return fail("forbidden");
  const branch = db.branches.find((b) => b.id === t.branchId)!;
  if (!branch.allowPostpone || t.queueType === "timed_entry" || t.queueType === "appointment") return fail("postpone_disabled");
  if (t.postponed) return fail("already_postponed");
  if (!["WAITING", "ARRIVED", "CALLED"].includes(t.status)) return fail("invalid_state");

  const line = lineFor(db, t.sessionId).filter((x) => x.id !== t.id && !x.priority);
  const currentIdx = t.status === "CALLED" ? -1 : lineFor(db, t.sessionId).filter((x) => !x.priority).findIndex((x) => x.id === t.id);
  const behind = line.slice(Math.max(0, currentIdx));
  const n = branch.postponePositions;
  if (behind.length === 0) {
    t.sortKey = now; // nobody behind: stays effectively at the end
  } else if (behind.length <= n) {
    t.sortKey = behind[behind.length - 1].sortKey + 1;
  } else {
    const a = behind[n - 1].sortKey;
    const b = behind[n].sortKey;
    t.sortKey = a + (b - a) / 2;
  }
  t.postponed = true;
  t.priority = false;
  const from = t.status;
  if (t.status === "CALLED") {
    t.status = t.arrivedAt ? "ARRIVED" : "WAITING";
    t.calledAt = undefined;
    t.counter = undefined;
    t.employeeId = undefined;
  }
  logEvent(db, t, "POSTPONED", actor, from, now, `moved back ${Math.min(n, behind.length)}`);
  // reset approach thresholds so customer is notified again
  t.notified = t.notified.filter((k) => k >= 1000);
  notify(db, t.userId, "POSTPONED", { ...ticketVars(db, t), ahead: peopleAhead(db, t) }, t.id, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

export function cancelTicket(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  if (!ownsOrStaff(actor, t)) return fail("forbidden");
  if (!["WAITING", "ARRIVED", "CALLED"].includes(t.status)) return fail("invalid_state");
  t.endedAt = now;
  transition(db, t, "CANCELLED", "CANCELLED", actor, now);
  notify(db, t.userId, "BOOKING_CANCELLED", { ...ticketVars(db, t), by: actor.id === t.userId ? "you" : "business" }, t.id, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

// ───────────────────────── staff operations ─────────────────────────

function requireStaff(db: DB, actor: Actor, businessId: string): ErrorCode | null {
  if (actor.role === "system") return null;
  if (!isStaffOf(actor, businessId)) return "forbidden";
  return null;
}

export function callNext(db: DB, actor: Actor, branchId: string, opts: { employeeId?: string } = {}, now = Date.now()): Result<Ticket | null> {
  const branch = db.branches.find((b) => b.id === branchId);
  if (!branch) return fail("not_found");
  const err = requireStaff(db, actor, branch.businessId);
  if (err) return fail(err);
  const session = ensureSession(db, branchId, now);
  const employee = opts.employeeId ? db.employees.find((e) => e.id === opts.employeeId) : undefined;
  const line = lineFor(db, session.id).filter((t) => {
    if (employee && !employee.serviceIds.includes(t.serviceId)) return false;
    // slotted tickets become callable 10 minutes before their slot
    if (t.slotStart && t.slotStart - now > 10 * 60e3) return false;
    return true;
  });
  const next = line[0];
  if (!next) return ok(null);
  const busyCounters = new Set(nowServing(db, branchId, now).map((t) => t.counter));
  const freeEmp =
    employee ??
    db.employees.find((e) => e.branchId === branchId && e.active && e.serviceIds.includes(next.serviceId) && !busyCounters.has(e.counter)) ??
    db.employees.find((e) => e.branchId === branchId && e.active);
  next.calledAt = now;
  next.counter = freeEmp?.counter ?? "1";
  next.employeeId = freeEmp?.id;
  transition(db, next, "CALLED", "CALLED", actor, now);
  notify(db, next.userId, "CALLED", ticketVars(db, next), next.id, now);
  afterQueueChange(db, session.id, now);
  return ok(next);
}

export function startService(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  const err = requireStaff(db, actor, t.businessId);
  if (err) return fail(err);
  if (!["CALLED", "ARRIVED"].includes(t.status)) return fail("invalid_state");
  if (!t.arrivedAt) t.arrivedAt = now;
  if (!t.calledAt) t.calledAt = now;
  t.startedAt = now;
  transition(db, t, "IN_SERVICE", "STARTED", actor, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

export function completeService(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  const err = requireStaff(db, actor, t.businessId);
  if (err) return fail(err);
  if (!["IN_SERVICE", "CALLED", "ARRIVED"].includes(t.status)) return fail("invalid_state");
  if (!t.startedAt) t.startedAt = now;
  if (!t.arrivedAt) t.arrivedAt = t.startedAt;
  t.endedAt = now;
  transition(db, t, "COMPLETED", "COMPLETED", actor, now);
  const emp = t.employeeId ? db.employees.find((e) => e.id === t.employeeId) : undefined;
  if (emp) {
    const mins = (now - t.startedAt) / 60000;
    emp.avgServiceMin = Math.round(((emp.avgServiceMin * emp.servedToday + mins) / (emp.servedToday + 1)) * 10) / 10;
    emp.servedToday += 1;
  }
  notify(db, t.userId, "SERVICE_COMPLETED", ticketVars(db, t), t.id, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

export function skipTicket(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  const err = requireStaff(db, actor, t.businessId);
  if (err) return fail(err);
  if (!["CALLED", "WAITING", "ARRIVED"].includes(t.status)) return fail("invalid_state");
  transition(db, t, "SKIPPED", "SKIPPED", actor, now);
  notify(db, t.userId, "SKIPPED", ticketVars(db, t), t.id, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

export function markNoShow(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  const err = requireStaff(db, actor, t.businessId);
  if (err) return fail(err);
  if (!["CALLED", "SKIPPED"].includes(t.status)) return fail("invalid_state");
  t.endedAt = now;
  transition(db, t, "NO_SHOW", "NO_SHOW", actor, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

/** Put a skipped ticket back at the end of the line. */
export function recallTicket(db: DB, actor: Actor, ticketId: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  const err = requireStaff(db, actor, t.businessId);
  if (err) return fail(err);
  if (t.status !== "SKIPPED") return fail("invalid_state");
  t.sortKey = now;
  t.calledAt = undefined;
  transition(db, t, t.arrivedAt ? "ARRIVED" : "WAITING", "RECALLED", actor, now);
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

/** Healthcare only: medical priority can be set exclusively by clinical staff, with a reason. */
export function prioritiseTicket(db: DB, actor: Actor, ticketId: string, reason: string, now = Date.now()): Result<Ticket> {
  const t = getTicket(db, ticketId);
  if (!t) return fail("not_found");
  if (!isStaffOf(actor, t.businessId) || !actor.clinical) return fail("forbidden");
  if (t.queueType !== "healthcare") return fail("invalid_state");
  if (!["WAITING", "ARRIVED"].includes(t.status) || !reason.trim()) return fail("invalid_state");
  t.priority = true;
  logEvent(db, t, "PRIORITISED", actor, t.status, now, reason.trim().slice(0, 200));
  afterQueueChange(db, t.sessionId, now);
  return ok(t);
}

export function addWalkIn(db: DB, actor: Actor, branchId: string, serviceId: string, guestLabel: string, now = Date.now()): Result<Ticket> {
  return createTicket(db, actor, { branchId, serviceId, channel: "walk_in", guestLabel: guestLabel.trim() || undefined }, now);
}

export function setSessionStatus(db: DB, actor: Actor, branchId: string, status: QueueSession["status"], now = Date.now()): Result<QueueSession> {
  const branch = db.branches.find((b) => b.id === branchId);
  if (!branch) return fail("not_found");
  const err = requireStaff(db, actor, branch.businessId);
  if (err) return fail(err);
  const s = ensureSession(db, branchId, now);
  s.status = status;
  return ok(s);
}

// ───────────────────────── reviews, favorites, profile ─────────────────────────

export function submitReview(
  db: DB,
  actor: Actor,
  input: { ticketId: string; rating: number; waitRating: number; serviceRating: number; text: string },
  now = Date.now(),
): Result<undefined> {
  const t = getTicket(db, input.ticketId);
  if (!t) return fail("not_found");
  if (actor.id === null || t.userId !== actor.id) return fail("forbidden");
  if (t.status !== "COMPLETED" || t.reviewed) return fail("review_not_allowed");
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  const user = db.users.find((u) => u.id === actor.id)!;
  db.reviews.push({
    id: uid("rev"),
    ticketId: t.id,
    userId: user.id,
    businessId: t.businessId,
    branchId: t.branchId,
    rating: clamp(input.rating),
    waitRating: clamp(input.waitRating),
    serviceRating: clamp(input.serviceRating),
    text: input.text.trim().slice(0, 1000),
    at: now,
    hidden: false,
    authorName: user.name,
  });
  t.reviewed = true;
  return ok(undefined);
}

export function toggleFavorite(db: DB, actor: Actor, kind: "branch" | "service", refId: string): Result<boolean> {
  if (!actor.id) return fail("forbidden");
  const i = db.favorites.findIndex((f) => f.userId === actor.id && f.kind === kind && f.refId === refId);
  if (i >= 0) {
    db.favorites.splice(i, 1);
    return ok(false);
  }
  db.favorites.push({ userId: actor.id, kind, refId });
  return ok(true);
}

export function branchRating(db: DB, branchId: string) {
  const rs = db.reviews.filter((r) => r.branchId === branchId && !r.hidden);
  if (!rs.length) return { avg: 0, count: 0 };
  return { avg: Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 10) / 10, count: rs.length };
}

// ───────────────────────── business management ─────────────────────────

function audit(db: DB, actor: Actor, action: string, target: string, now: number, note?: string) {
  const user = actor.id ? db.users.find((u) => u.id === actor.id) : undefined;
  db.audit.push({ id: uid("aud"), actorId: actor.id ?? "system", actorLabel: user?.name ?? "System", action, target, at: now, note });
}

export function upsertService(db: DB, actor: Actor, s: Service, now = Date.now()): Result<Service> {
  if (!isStaffOf(actor, s.businessId) || actor.role !== "business_owner") return fail("forbidden");
  const clean: Service = {
    ...s,
    durationMin: Math.min(480, Math.max(1, Math.round(s.durationMin))),
    prefix: (s.prefix || "A").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "A",
    maxQueue: s.maxQueue ? Math.max(1, Math.round(s.maxQueue)) : undefined,
  };
  const i = db.services.findIndex((x) => x.id === s.id);
  if (i >= 0) {
    if (db.services[i].businessId !== s.businessId) return fail("forbidden");
    db.services[i] = clean;
  } else db.services.push(clean);
  audit(db, actor, i >= 0 ? "service.updated" : "service.created", clean.name.en, now);
  return ok(clean);
}

export function upsertEmployee(db: DB, actor: Actor, e: Employee, now = Date.now()): Result<Employee> {
  if (!isStaffOf(actor, e.businessId) || actor.role !== "business_owner") return fail("forbidden");
  const branch = db.branches.find((b) => b.id === e.branchId);
  if (!branch || branch.businessId !== e.businessId) return fail("forbidden");
  const i = db.employees.findIndex((x) => x.id === e.id);
  if (i >= 0) db.employees[i] = e;
  else db.employees.push(e);
  audit(db, actor, i >= 0 ? "employee.updated" : "employee.created", e.name, now);
  return ok(e);
}

export function upsertBranch(db: DB, actor: Actor, b: Branch, now = Date.now()): Result<Branch> {
  if (!isStaffOf(actor, b.businessId) || actor.role !== "business_owner") return fail("forbidden");
  const clean: Branch = {
    ...b,
    postponePositions: Math.min(20, Math.max(1, Math.round(b.postponePositions))),
    maxQueue: Math.min(500, Math.max(1, Math.round(b.maxQueue))),
  };
  const i = db.branches.findIndex((x) => x.id === b.id);
  if (i >= 0) {
    if (db.branches[i].businessId !== b.businessId) return fail("forbidden");
    clean.checkinSecret = db.branches[i].checkinSecret; // never editable from UI
    db.branches[i] = clean;
  } else {
    clean.checkinSecret = uid("sec");
    db.branches.push(clean);
    for (const s of db.services.filter((x) => x.businessId === b.businessId)) if (!s.branchIds.includes(b.id)) s.branchIds.push(b.id);
  }
  audit(db, actor, i >= 0 ? "branch.updated" : "branch.created", clean.name.en, now);
  return ok(clean);
}

export interface BusinessRegistration {
  ownerName: string;
  phone: string;
  email: string;
  businessNameEn: string;
  businessNameAr: string;
  categoryId: string;
  crNumber: string;
  areaId: string;
  address: string;
}

export function registerBusiness(db: DB, input: BusinessRegistration, now = Date.now()): Result<{ user: User; business: Business }> {
  const bizId = uid("biz");
  const userId = uid("usr");
  const area = db.areas.find((a) => a.id === input.areaId) ?? db.areas[0];
  const user: User = {
    id: userId, name: input.ownerName.trim(), phone: input.phone, email: input.email || undefined, locale: "ar", role: "business_owner",
    businessId: bizId, avatarHue: 210, status: "active", createdAt: now, savedLocations: [],
    prefs: { inApp: true, push: false, sms: false, whatsapp: false, approachingAt: 3 },
  };
  const business: Business = {
    id: bizId, name: { en: input.businessNameEn.trim(), ar: input.businessNameAr.trim() || input.businessNameEn.trim() },
    description: { en: "", ar: "" }, categoryId: input.categoryId, ownerId: userId, hue: 212,
    initials: input.businessNameEn.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "MB",
    phone: input.phone, email: input.email, crNumber: input.crNumber.trim(), verification: "pending", isDemo: false, createdAt: now,
  };
  const cat = db.categories.find((c) => c.id === input.categoryId);
  const branchId = `br_new_${uid()}`;
  db.users.push(user);
  db.businesses.push(business);
  db.branches.push({
    id: branchId, businessId: bizId, name: { en: "Main Branch", ar: "الفرع الرئيسي" }, areaId: area.id,
    address: { en: input.address, ar: input.address }, lat: area.lat, lng: area.lng, phone: input.phone,
    hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "09:00", close: "21:00", closed: day === 5 })), active: true,
    queueType: cat?.defaultQueueType ?? "standard", remoteBooking: true, allowPostpone: true, postponePositions: 3, maxQueue: 50,
    checkinSecret: uid("sec"), slotMinutes: 30, slotCapacity: 10,
  });
  db.services.push({
    id: uid("srv"), businessId: bizId, branchIds: [branchId], name: { en: "General Service", ar: "خدمة عامة" }, description: { en: "", ar: "" },
    durationMin: 15, prefix: "A", active: true, remoteBooking: true,
  });
  db.employees.push({
    id: uid("emp"), businessId: bizId, branchId, name: input.ownerName.trim(), title: { en: "Owner", ar: "المالك" }, serviceIds: [db.services[db.services.length - 1].id],
    counter: "1", active: true, clinical: false, servedToday: 0, avgServiceMin: 15, rating: 0,
  });
  audit(db, { id: userId, role: "business_owner" }, "business.registered", business.name.en, now);
  return ok({ user, business });
}

// ───────────────────────── admin ─────────────────────────

export function setBusinessVerification(db: DB, actor: Actor, businessId: string, status: Business["verification"], note: string, now = Date.now()): Result<Business> {
  if (!can(actor, "businesses.verify")) return fail("forbidden");
  if (status === "suspended" && actor.adminRole !== "super_admin") return fail("forbidden");
  const b = db.businesses.find((x) => x.id === businessId);
  if (!b) return fail("not_found");
  b.verification = status;
  audit(db, actor, `business.${status}`, b.name.en, now, note || undefined);
  return ok(b);
}

export function setUserStatus(db: DB, actor: Actor, userId: string, status: User["status"], note: string, now = Date.now()): Result<User> {
  if (!can(actor, "users.suspend")) return fail("forbidden");
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.id === actor.id) return fail("invalid_state");
  u.status = status;
  audit(db, actor, status === "suspended" ? "user.suspended" : "user.reactivated", u.name, now, note || undefined);
  return ok(u);
}

export function upsertCategory(db: DB, actor: Actor, c: Category, now = Date.now()): Result<Category> {
  if (!can(actor, "categories.manage")) return fail("forbidden");
  const i = db.categories.findIndex((x) => x.id === c.id);
  if (i >= 0) db.categories[i] = c;
  else db.categories.push(c);
  audit(db, actor, i >= 0 ? "category.updated" : "category.created", c.name.en, now);
  return ok(c);
}

export function setReviewHidden(db: DB, actor: Actor, reviewId: string, hidden: boolean, now = Date.now()): Result<undefined> {
  if (!can(actor, "reviews.moderate")) return fail("forbidden");
  const r = db.reviews.find((x) => x.id === reviewId);
  if (!r) return fail("not_found");
  r.hidden = hidden;
  audit(db, actor, hidden ? "review.hidden" : "review.restored", r.id, now);
  return ok(undefined);
}

export function setReportStatus(db: DB, actor: Actor, reportId: string, status: "open" | "resolved" | "dismissed", now = Date.now()): Result<undefined> {
  if (!can(actor, "reports.manage")) return fail("forbidden");
  const r = db.reports.find((x) => x.id === reportId);
  if (!r) return fail("not_found");
  r.status = status;
  audit(db, actor, `report.${status}`, r.id, now);
  return ok(undefined);
}
