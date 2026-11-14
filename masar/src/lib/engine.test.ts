import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import {
  callNext,
  cancelTicket,
  completeService,
  confirmArrival,
  createTicket,
  lineFor,
  peopleAhead,
  postponeTicket,
  prioritiseTicket,
  setBusinessVerification,
  skipTicket,
  slotsFor,
  startService,
  submitReview,
} from "./engine";
import { bestTimeToVisit, estimateWait } from "./intelligence";
import { ensureDemoToday, simulateTick } from "./demo";
import { checkinCode, kuwaitTimeToday } from "./utils";
import type { Actor, DB, User } from "./types";

// Monday 2026-11-16 18:00 Kuwait — Oasis Salmiya is open 09:00–23:00
const NOW = kuwaitTimeToday("18:00", Date.UTC(2026, 10, 16, 12));
const BR = "br_oasis_salmiya";
const CUT = "srv_oasis_cut";
const OWNER: Actor = { id: "u_owner_oasis", role: "business_owner", businessId: "biz_oasis" };

function addCustomer(db: DB, id: string): Actor {
  const u: User = {
    id, name: `Customer ${id}`, phone: "+96550000000", locale: "en", role: "customer", avatarHue: 0, status: "active", createdAt: NOW,
    savedLocations: [], prefs: { inApp: true, push: false, sms: false, whatsapp: false, approachingAt: 3 },
  };
  db.users.push(u);
  return { id, role: "customer" };
}

function book(db: DB, a: Actor, t = NOW) {
  const r = createTicket(db, a, { branchId: BR, serviceId: CUT, channel: "remote" }, t);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

describe("ticket creation", () => {
  it("numbers tickets sequentially per prefix and session", () => {
    const db = createSeed(NOW);
    const a = book(db, addCustomer(db, "a"));
    const b = book(db, addCustomer(db, "b"), NOW + 1000);
    expect(a.number).toBe("A-001");
    expect(b.number).toBe("A-002");
    expect(peopleAhead(db, b)).toBe(1);
    expect(db.events.filter((e) => e.type === "CREATED")).toHaveLength(2);
    expect(db.notifications.some((n) => n.userId === "a" && n.type === "BOOKING_CONFIRMED")).toBe(true);
  });

  it("prevents duplicate active tickets at the same branch", () => {
    const db = createSeed(NOW);
    const c = addCustomer(db, "a");
    book(db, c);
    const r = createTicket(db, c, { branchId: BR, serviceId: "srv_oasis_beard", channel: "remote" }, NOW);
    expect(r).toEqual({ ok: false, error: "duplicate_active_ticket" });
  });

  it("rejects bookings when closed, unverified, or remote disabled", () => {
    const db = createSeed(NOW);
    const c = addCustomer(db, "a");
    const night = kuwaitTimeToday("03:00", NOW);
    expect(createTicket(db, c, { branchId: BR, serviceId: CUT, channel: "remote" }, night)).toEqual({ ok: false, error: "branch_closed" });
    expect(createTicket(db, c, { branchId: "br_fields_jahra", serviceId: "srv_fields_butcher", channel: "remote" }, NOW)).toEqual({ ok: false, error: "remote_booking_disabled" });
    db.businesses.find((b) => b.id === "biz_oasis")!.verification = "suspended";
    expect(createTicket(db, c, { branchId: BR, serviceId: CUT, channel: "remote" }, NOW)).toEqual({ ok: false, error: "not_verified" });
  });

  it("on-site QR check-in requires the rotating branch code", () => {
    const db = createSeed(NOW);
    const c = addCustomer(db, "a");
    expect(createTicket(db, c, { branchId: BR, serviceId: CUT, channel: "onsite_qr", checkinCode: "WRONG1" }, NOW)).toEqual({ ok: false, error: "invalid_checkin_code" });
    const code = checkinCode(db.branches.find((b) => b.id === BR)!.checkinSecret, NOW);
    const r = createTicket(db, c, { branchId: BR, serviceId: CUT, channel: "onsite_qr", checkinCode: code }, NOW);
    expect(r.ok && r.data.status).toBe("ARRIVED");
  });

  it("customers cannot create walk-in tickets", () => {
    const db = createSeed(NOW);
    const c = addCustomer(db, "a");
    expect(createTicket(db, c, { branchId: BR, serviceId: CUT, channel: "walk_in" }, NOW)).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("postpone", () => {
  it("moves back N places, only once, never ahead", () => {
    const db = createSeed(NOW);
    const users = ["a", "b", "c", "d", "e", "f"].map((id) => addCustomer(db, id));
    const tickets = users.map((u, i) => book(db, u, NOW + i * 1000));
    const r = postponeTicket(db, users[0], tickets[0].id, NOW + 10_000);
    expect(r.ok).toBe(true);
    const order = lineFor(db, tickets[0].sessionId).map((t) => t.userId);
    expect(order).toEqual(["b", "c", "d", "a", "e", "f"]);
    expect(postponeTicket(db, users[0], tickets[0].id, NOW + 11_000)).toEqual({ ok: false, error: "already_postponed" });
    // last in line postponing stays last
    const r2 = postponeTicket(db, users[5], tickets[5].id, NOW + 12_000);
    expect(r2.ok).toBe(true);
    expect(lineFor(db, tickets[0].sessionId).at(-1)?.userId).toBe("f");
  });

  it("only the ticket owner can postpone", () => {
    const db = createSeed(NOW);
    const a = addCustomer(db, "a");
    const b = addCustomer(db, "b");
    const t = book(db, a);
    expect(postponeTicket(db, b, t.id, NOW)).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("arrival", () => {
  it("customer needs the on-site code; staff does not", () => {
    const db = createSeed(NOW);
    const a = addCustomer(db, "a");
    const t = book(db, a);
    expect(confirmArrival(db, a, t.id, undefined, NOW)).toEqual({ ok: false, error: "invalid_checkin_code" });
    expect(confirmArrival(db, a, t.id, "ZZZZZZ", NOW)).toEqual({ ok: false, error: "invalid_checkin_code" });
    const code = checkinCode(db.branches.find((b) => b.id === BR)!.checkinSecret, NOW);
    expect(confirmArrival(db, a, t.id, code, NOW).ok).toBe(true);
    const t2 = book(db, addCustomer(db, "b"));
    expect(confirmArrival(db, OWNER, t2.id, undefined, NOW).ok).toBe(true);
  });
});

describe("staff flow", () => {
  it("call → start → complete, events logged, review allowed once", () => {
    const db = createSeed(NOW);
    const a = addCustomer(db, "a");
    const t = book(db, a);
    const called = callNext(db, OWNER, BR, {}, NOW + 1000);
    expect(called.ok && called.data?.id).toBe(t.id);
    expect(startService(db, OWNER, t.id, NOW + 2000).ok).toBe(true);
    expect(submitReview(db, a, { ticketId: t.id, rating: 5, waitRating: 5, serviceRating: 5, text: "" }, NOW)).toEqual({ ok: false, error: "review_not_allowed" });
    expect(completeService(db, OWNER, t.id, NOW + 600_000).ok).toBe(true);
    expect(db.events.filter((e) => e.ticketId === t.id).map((e) => e.type)).toEqual(["CREATED", "CALLED", "STARTED", "COMPLETED"]);
    expect(submitReview(db, a, { ticketId: t.id, rating: 5, waitRating: 4, serviceRating: 5, text: "Great" }, NOW).ok).toBe(true);
    expect(submitReview(db, a, { ticketId: t.id, rating: 5, waitRating: 4, serviceRating: 5, text: "Again" }, NOW).ok).toBe(false);
  });

  it("other businesses cannot operate this queue", () => {
    const db = createSeed(NOW);
    const t = book(db, addCustomer(db, "a"));
    const other: Actor = { id: "u_owner_qahwa", role: "business_owner", businessId: "biz_qahwa" };
    expect(callNext(db, other, BR, {}, NOW)).toEqual({ ok: false, error: "forbidden" });
    expect(skipTicket(db, other, t.id, NOW)).toEqual({ ok: false, error: "forbidden" });
    expect(cancelTicket(db, { id: "x", role: "customer" }, t.id, NOW)).toEqual({ ok: false, error: "forbidden" });
  });

  it("threshold notifications fire as the line moves", () => {
    const db = createSeed(NOW);
    const users = Array.from({ length: 7 }, (_, i) => addCustomer(db, `c${i}`));
    const tickets = users.map((u, i) => book(db, u, NOW + i * 1000));
    const me = tickets[6];
    expect(db.notifications.some((n) => n.ticketId === me.id && n.type === "FIVE_AHEAD")).toBe(false);
    callNext(db, OWNER, BR, {}, NOW + 10_000); // 5 ahead now
    expect(db.notifications.some((n) => n.ticketId === me.id && n.type === "FIVE_AHEAD")).toBe(true);
    for (let i = 0; i < 5; i++) {
      const c = db.tickets.find((t) => t.status === "CALLED");
      if (c) completeService(db, OWNER, c.id, NOW + 20_000 + i);
      callNext(db, OWNER, BR, {}, NOW + 30_000 + i);
    }
    const types = db.notifications.filter((n) => n.ticketId === me.id).map((n) => n.type);
    expect(types).toContain("TURN_APPROACHING");
    expect(types).toContain("CONFIRM_ARRIVAL");
    expect(types).toContain("TURN_NEXT");
  });
});

describe("healthcare priority", () => {
  it("only clinical staff can prioritise, with a reason", () => {
    const db = createSeed(NOW);
    const now = kuwaitTimeToday("10:00", NOW);
    const a = addCustomer(db, "a");
    const b = addCustomer(db, "b");
    const ra = createTicket(db, a, { branchId: "br_shifa_hawalli", serviceId: "srv_shifa_walkin", channel: "remote" }, now);
    const rb = createTicket(db, b, { branchId: "br_shifa_hawalli", serviceId: "srv_shifa_walkin", channel: "remote" }, now + 1000);
    if (!ra.ok || !rb.ok) throw new Error("booking failed");
    const nonClinical: Actor = { id: "u_owner_shifa", role: "business_owner", businessId: "biz_shifa" };
    expect(prioritiseTicket(db, nonClinical, rb.data.id, "chest pain", now)).toEqual({ ok: false, error: "forbidden" });
    expect(prioritiseTicket(db, a, rb.data.id, "me first", now)).toEqual({ ok: false, error: "forbidden" });
    const clinical: Actor = { ...nonClinical, clinical: true };
    expect(prioritiseTicket(db, clinical, rb.data.id, "", now).ok).toBe(false);
    expect(prioritiseTicket(db, clinical, rb.data.id, "Triage: urgent", now).ok).toBe(true);
    expect(lineFor(db, rb.data.sessionId)[0].id).toBe(rb.data.id);
  });
});

describe("timed entry", () => {
  it("enforces slot capacity", () => {
    const db = createSeed(NOW);
    const branch = db.branches.find((b) => b.id === "br_heritage_kc")!;
    branch.slotCapacity = 1;
    const svc = db.services.find((s) => s.id === "srv_heritage_entry")!;
    const now = kuwaitTimeToday("10:00", NOW + 864e5); // Tuesday (museum closed Mondays)
    const slot = slotsFor(db, branch, svc, now).find((s) => !s.past)!;
    const r1 = createTicket(db, addCustomer(db, "a"), { branchId: branch.id, serviceId: svc.id, channel: "remote", slotStart: slot.start }, now);
    expect(r1.ok).toBe(true);
    const r2 = createTicket(db, addCustomer(db, "b"), { branchId: branch.id, serviceId: svc.id, channel: "remote", slotStart: slot.start }, now);
    expect(r2).toEqual({ ok: false, error: "slot_full" });
  });
});

describe("intelligence", () => {
  it("returns a range that grows with people ahead", () => {
    const db = createSeed(NOW);
    const users = Array.from({ length: 6 }, (_, i) => addCustomer(db, `c${i}`));
    const tickets = users.map((u, i) => book(db, u, NOW + i * 1000));
    const e0 = estimateWait(db, BR, CUT, [], NOW);
    const e6 = estimateWait(db, BR, CUT, tickets, NOW);
    expect(e6.mid).toBeGreaterThan(e0.mid);
    expect(e6.high).toBeGreaterThan(e6.low);
  });

  it("only recommends best time with enough history", () => {
    const db = createSeed(NOW);
    expect(bestTimeToVisit(db, BR, NOW).available).toBe(true);
    db.branches.push({ ...db.branches[0], id: "br_new_x" });
    expect(bestTimeToVisit(db, "br_new_x", NOW).available).toBe(false);
  });
});

describe("admin rbac", () => {
  it("support cannot verify businesses; moderator can", () => {
    const db = createSeed(NOW);
    expect(setBusinessVerification(db, { id: "u_support", role: "admin", adminRole: "support" }, "biz_nuqat", "verified", "", NOW).ok).toBe(false);
    expect(setBusinessVerification(db, { id: "u_mod", role: "admin", adminRole: "moderator" }, "biz_nuqat", "verified", "", NOW).ok).toBe(true);
    expect(db.audit.at(-1)?.action).toBe("business.verified");
  });
});

describe("demo simulator", () => {
  it("seeds today and advances queues without touching the user's unarrived call", () => {
    const db = createSeed(NOW);
    ensureDemoToday(db, NOW);
    expect(db.tickets.length).toBeGreaterThan(10);
    const a = addCustomer(db, "me");
    const t = book(db, a, NOW);
    for (let i = 0; i < 200; i++) simulateTick(db, NOW + i * 60_000, 1);
    const mine = db.tickets.find((x) => x.id === t.id)!;
    expect(mine.status).toBe("CALLED");
  });
});
