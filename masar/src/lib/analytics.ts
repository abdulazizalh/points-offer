import type { DB } from "./types";
import { branchRating } from "./engine";
import { kuwaitDate } from "./utils";

export function todayStats(db: DB, branchIds: string[], now = Date.now()) {
  const date = kuwaitDate(now);
  const tickets = db.tickets.filter((t) => branchIds.includes(t.branchId) && kuwaitDate(t.createdAt) === date);
  const started = tickets.filter((t) => t.startedAt);
  const done = tickets.filter((t) => t.status === "COMPLETED" && t.startedAt && t.endedAt);
  const closedOut = tickets.filter((t) => ["COMPLETED", "NO_SHOW"].includes(t.status));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const ratings = branchIds.map((b) => branchRating(db, b)).filter((r) => r.count);
  return {
    customers: tickets.length,
    active: tickets.filter((t) => ["WAITING", "ARRIVED", "CALLED", "IN_SERVICE"].includes(t.status)).length,
    completed: tickets.filter((t) => t.status === "COMPLETED").length,
    cancelled: tickets.filter((t) => t.status === "CANCELLED").length,
    avgWait: Math.round(avg(started.map((t) => (t.startedAt! - t.createdAt) / 60000))),
    avgService: Math.round(avg(done.map((t) => (t.endedAt! - t.startedAt!) / 60000))),
    noShowRate: closedOut.length ? Math.round((tickets.filter((t) => t.status === "NO_SHOW").length / closedOut.length) * 100) : 0,
    rating: ratings.length ? Math.round((ratings.reduce((a, r) => a + r.avg * r.count, 0) / ratings.reduce((a, r) => a + r.count, 0)) * 10) / 10 : 0,
    ratingCount: ratings.reduce((a, r) => a + r.count, 0),
  };
}
