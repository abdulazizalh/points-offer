import type { Area, Branch, Business, Category, DB, Service, Ticket } from "./types";
import { ACTIVE_STATUSES } from "./types";
import { branchLine, branchRating, nowServing, queueTypeOf } from "./engine";
import { currentCrowd, estimateWait, type CrowdLevel, type WaitEstimate } from "./intelligence";
import { distanceKm, isBranchOpen } from "./utils";
import type { DeviceSession } from "./store";

export interface BranchView {
  branch: Branch;
  business: Business;
  category: Category;
  area: Area;
  services: Service[];
  waiting: number;
  estimate: WaitEstimate;
  open: boolean;
  distance: number | null;
  rating: { avg: number; count: number };
  serving: string | null;
  crowd: CrowdLevel;
  slotted: boolean;
  bookable: boolean;
}

export function origin(db: DB, session: DeviceSession) {
  if (session.gps) return session.gps;
  const a = db.areas.find((x) => x.id === session.areaId) ?? db.areas[0];
  return { lat: a.lat, lng: a.lng };
}

export function branchView(db: DB, branch: Branch, from: { lat: number; lng: number } | null, now = Date.now()): BranchView | null {
  const business = db.businesses.find((b) => b.id === branch.businessId);
  if (!business) return null;
  const category = db.categories.find((c) => c.id === business.categoryId)!;
  const area = db.areas.find((a) => a.id === branch.areaId) ?? db.areas[0];
  const services = db.services.filter((s) => s.branchIds.includes(branch.id) && s.active);
  const line = branchLine(db, branch.id, now).filter((t) => t.queueType !== "timed_entry" && t.queueType !== "appointment");
  const firstSvc = services.find((s) => {
    const q = queueTypeOf(branch, s);
    return q !== "timed_entry" && q !== "appointment";
  });
  const estimate = estimateWait(db, branch.id, firstSvc?.id ?? services[0]?.id ?? "", line, now);
  const serving = nowServing(db, branch.id, now)[0]?.number ?? null;
  const slotted = services.length > 0 && services.every((s) => ["timed_entry", "appointment"].includes(queueTypeOf(branch, s)));
  const open = isBranchOpen(branch, now);
  return {
    branch,
    business,
    category,
    area,
    services,
    waiting: line.length,
    estimate,
    open,
    distance: from ? distanceKm(from, branch) : null,
    rating: branchRating(db, branch.id),
    serving,
    crowd: currentCrowd(db, branch.id, line.length),
    slotted,
    bookable: business.verification === "verified" && branch.active && branch.remoteBooking && (open || slotted),
  };
}

export function publicBranches(db: DB, from: { lat: number; lng: number } | null, now = Date.now()): BranchView[] {
  return db.branches
    .filter((b) => b.active)
    .map((b) => branchView(db, b, from, now))
    .filter((v): v is BranchView => !!v && v.business.verification === "verified" && v.category.active);
}

export function activeTickets(db: DB, userId: string | undefined): Ticket[] {
  if (!userId) return [];
  return db.tickets.filter((t) => t.userId === userId && ACTIVE_STATUSES.includes(t.status)).sort((a, b) => b.createdAt - a.createdAt);
}

export function searchBranches(views: BranchView[], q: string): BranchView[] {
  const s = q.trim().toLowerCase();
  if (!s) return views;
  return views.filter((v) =>
    [v.business.name.en, v.business.name.ar, v.branch.name.en, v.branch.name.ar, v.area.name.en, v.area.name.ar, v.category.name.en, v.category.name.ar, ...v.services.flatMap((x) => [x.name.en, x.name.ar])]
      .join(" ")
      .toLowerCase()
      .includes(s),
  );
}

export type SortKey = "nearest" | "lowest" | "popular";

export function sortBranches(views: BranchView[], key: SortKey): BranchView[] {
  const arr = [...views];
  if (key === "nearest") arr.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  if (key === "lowest") arr.sort((a, b) => Number(b.open) - Number(a.open) || (a.slotted ? 1 : 0) - (b.slotted ? 1 : 0) || a.estimate.mid - b.estimate.mid);
  if (key === "popular") arr.sort((a, b) => b.rating.count * b.rating.avg - a.rating.count * a.rating.avg);
  return arr;
}
