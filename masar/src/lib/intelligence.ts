// Queue intelligence: waiting-time prediction, crowd detection and best-time-to-visit.
// All functions are pure and deterministic so they can run on the client (demo)
// or inside an edge function / Postgres job (production).
import type { Branch, DB, Service, Ticket } from "./types";
import { hashString, isBranchOpen, kuwaitDate, kuwaitParts, mulberry32 } from "./utils";

export interface DailyStat {
  date: string;
  volume: number;
  avgWait: number;
  avgService: number;
  cancelled: number;
  noShow: number;
  satisfaction: number;
}

export interface BranchHistory {
  samples: number; // number of historical tickets behind these numbers
  isDemo: boolean;
  byWeekdayHour: number[][]; // [weekday][hour] average arrivals
  daily: DailyStat[]; // last 30 days, oldest first
  serviceAvg: Record<string, { avg: number; n: number }>;
}

// Category arrival curves: peak hours with weights.
const CURVES: Record<string, Array<[number, number]>> = {
  cat_food: [[13, 1], [20, 1.3], [9, 0.5]],
  cat_salon: [[19, 1.2], [21, 0.9], [12, 0.4]],
  cat_clinic: [[9, 1], [17, 0.9], [11, 0.6]],
  cat_hospital: [[8, 1.2], [10, 1], [17, 0.6]],
  cat_car: [[10, 0.8], [17, 1.1]],
  cat_fun: [[20, 1.3], [17, 0.8]],
  cat_events: [[19, 1.2], [21, 1]],
  cat_gov: [[8, 1.3], [10, 1]],
  cat_market: [[11, 0.8], [19, 1.2]],
  cat_bank: [[9, 1.1], [12, 0.9]],
  cat_retail: [[18, 1], [21, 1.1]],
  cat_museum: [[10, 0.9], [16, 1.1]],
};

const historyCache = new Map<string, BranchHistory>();

function hourOpen(branch: Branch, day: number, hour: number): boolean {
  const h = branch.hours.find((x) => x.day === day);
  if (!h || h.closed) return false;
  const o = Number(h.open.split(":")[0]);
  let c = Number(h.close.split(":")[0]);
  if (c <= o) c += 24;
  const hh = hour < o ? hour + 24 : hour;
  return hh >= o && hh < c;
}

/** Synthetic history for demo branches; real branches start empty and fill from completed tickets. */
export function branchHistory(db: DB, branchId: string): BranchHistory {
  const branch = db.branches.find((b) => b.id === branchId);
  const business = branch && db.businesses.find((b) => b.id === branch.businessId);
  const realCompleted = db.tickets.filter((t) => t.branchId === branchId && t.status === "COMPLETED" && t.startedAt && t.endedAt);

  let base: BranchHistory;
  const cacheKey = `${branchId}`;
  if (branch && business?.isDemo && !branchId.startsWith("br_new")) {
    const cached = historyCache.get(cacheKey);
    if (cached) base = cached;
    else {
      const rand = mulberry32(hashString(branchId));
      const curve = CURVES[business.categoryId] ?? [[12, 1]];
      const scale = 2 + rand() * 4;
      const byWeekdayHour = [0, 1, 2, 3, 4, 5, 6].map((day) =>
        Array.from({ length: 24 }, (_, hour) => {
          if (!hourOpen(branch, day, hour)) return 0;
          const v = curve.reduce((s, [p, w]) => s + w * Math.exp(-((hour - p) ** 2) / 4), 0.15);
          const weekend = day === 5 || day === 6 ? 1.25 : day === 4 ? 1.15 : 1;
          return Math.round(v * scale * weekend * (0.85 + rand() * 0.3) * 10) / 10;
        }),
      );
      const services = db.services.filter((s) => s.branchIds.includes(branchId));
      const serviceAvg: BranchHistory["serviceAvg"] = {};
      for (const s of services) serviceAvg[s.id] = { avg: Math.round(s.durationMin * (0.88 + rand() * 0.3) * 10) / 10, n: 150 + Math.floor(rand() * 600) };
      const daily: DailyStat[] = [];
      const now = Date.now();
      for (let i = 30; i >= 1; i--) {
        const ts = now - i * 864e5;
        const day = kuwaitParts(ts).day;
        const volume = Math.round(byWeekdayHour[day].reduce((a, b) => a + b, 0) * (0.85 + rand() * 0.3));
        daily.push({
          date: kuwaitDate(ts),
          volume,
          avgWait: Math.round((8 + rand() * 18) * (day === 5 || day === 6 ? 1.2 : 1)),
          avgService: Math.round((services[0]?.durationMin ?? 15) * (0.9 + rand() * 0.25)),
          cancelled: Math.round(volume * (0.04 + rand() * 0.05)),
          noShow: Math.round(volume * (0.02 + rand() * 0.04)),
          satisfaction: Math.round((4.2 + rand() * 0.7) * 10) / 10,
        });
      }
      base = { samples: daily.reduce((a, d) => a + d.volume, 0), isDemo: true, byWeekdayHour, daily, serviceAvg };
      historyCache.set(cacheKey, base);
    }
  } else {
    base = { samples: 0, isDemo: false, byWeekdayHour: Array.from({ length: 7 }, () => Array(24).fill(0)), daily: [], serviceAvg: {} };
  }

  if (!realCompleted.length) return base;
  // Blend in real completed tickets.
  const serviceAvg = { ...base.serviceAvg };
  for (const t of realCompleted) {
    const mins = (t.endedAt! - t.startedAt!) / 60000;
    if (mins <= 0 || mins > 240) continue;
    const cur = serviceAvg[t.serviceId] ?? { avg: mins, n: 0 };
    serviceAvg[t.serviceId] = { avg: (cur.avg * cur.n + mins) / (cur.n + 1), n: cur.n + 1 };
  }
  return { ...base, samples: base.samples + realCompleted.length, serviceAvg };
}

/** Average service minutes for a service: configured duration blended with history. */
export function serviceMinutes(db: DB, service: Service, branchId: string): number {
  const h = branchHistory(db, branchId).serviceAvg[service.id];
  if (!h || h.n === 0) return service.durationMin;
  const w = h.n / (h.n + 20);
  return service.durationMin * (1 - w) + h.avg * w;
}

export function activeServers(db: DB, branchId: string, serviceId?: string): number {
  const n = db.employees.filter((e) => e.branchId === branchId && e.active && (!serviceId || e.serviceIds.includes(serviceId))).length;
  return Math.max(1, n);
}

export interface WaitEstimate {
  low: number;
  high: number;
  mid: number;
  ahead: number;
  servers: number;
  confidence: "low" | "medium" | "high";
}

/**
 * Estimate waiting time for someone who would join behind `ahead`.
 * Uses: people ahead, their services' durations, active employees, historical
 * service time, remaining time of tickets in service, and peak-hour load.
 * Returns a range — never a single "exact" number.
 */
export function estimateWait(db: DB, branchId: string, serviceId: string, ahead: Ticket[], now = Date.now()): WaitEstimate {
  const servers = activeServers(db, branchId, serviceId);
  const svc = (id: string) => db.services.find((s) => s.id === id);
  let work = 0;
  for (const t of ahead) {
    const s = svc(t.serviceId);
    if (s) work += serviceMinutes(db, s, branchId);
  }
  const inService = db.tickets.filter((t) => t.branchId === branchId && (t.status === "IN_SERVICE" || t.status === "CALLED"));
  for (const t of inService) {
    const s = svc(t.serviceId);
    if (!s) continue;
    const avg = serviceMinutes(db, s, branchId);
    const elapsed = ((now - (t.startedAt ?? t.calledAt ?? now)) / 60000);
    work += Math.max(avg * 0.15, avg - elapsed);
  }
  const hist = branchHistory(db, branchId);
  const p = kuwaitParts(now);
  const row = hist.byWeekdayHour[p.day];
  const nonZero = row.filter((x) => x > 0);
  const mean = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const peak = mean > 0 ? Math.min(1.3, Math.max(0.9, 1 + 0.15 * (row[p.h] / mean - 1))) : 1;
  const mid = (work / servers) * peak;
  const n = hist.samples;
  const confidence = n > 2000 ? "high" : n > 200 ? "medium" : "low";
  const spread = confidence === "high" ? 0.15 : confidence === "medium" ? 0.25 : 0.4;
  const low = Math.max(0, Math.floor(mid * (1 - spread)));
  const high = Math.max(low + 1, Math.ceil(mid * (1 + spread) + 1));
  return { low, high, mid, ahead: ahead.length, servers, confidence };
}

export type CrowdLevel = "low" | "medium" | "high";

export interface BestTime {
  available: boolean;
  samples: number;
  hours: Array<{ hour: number; level: CrowdLevel; value: number }>;
  best: number[]; // up to 3 recommended upcoming hours
}

export const MIN_SAMPLES_FOR_RECOMMENDATION = 200;

export function bestTimeToVisit(db: DB, branchId: string, now = Date.now()): BestTime {
  const hist = branchHistory(db, branchId);
  const p = kuwaitParts(now);
  const row = hist.byWeekdayHour[p.day];
  const open = row.map((v, hour) => ({ hour, value: v })).filter((x) => x.value > 0);
  if (hist.samples < MIN_SAMPLES_FOR_RECOMMENDATION || open.length < 3) return { available: false, samples: hist.samples, hours: [], best: [] };
  const sorted = [...open].map((x) => x.value).sort((a, b) => a - b);
  const t1 = sorted[Math.floor(sorted.length / 3)];
  const t2 = sorted[Math.floor((sorted.length * 2) / 3)];
  const hours = open.map((x) => ({ ...x, level: (x.value < t1 ? "low" : x.value < t2 ? "medium" : "high") as CrowdLevel }));
  const best = hours
    .filter((h) => h.hour > p.h)
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((h) => h.hour)
    .sort((a, b) => a - b);
  return { available: true, samples: hist.samples, hours, best };
}

export function currentCrowd(db: DB, branchId: string, waiting: number): CrowdLevel {
  const branch = db.branches.find((b) => b.id === branchId);
  const servers = activeServers(db, branchId);
  const perServer = waiting / servers;
  if (!branch) return "low";
  return perServer < 2 ? "low" : perServer < 5 ? "medium" : "high";
}

export type AlertKind = "surge" | "slow_service" | "long_wait" | "near_capacity" | "no_staff";

export interface CrowdAlert {
  kind: AlertKind;
  severity: "warning" | "critical";
  vars: Record<string, string | number>;
}

/** Operational alerts for business admins. */
export function detectAlerts(db: DB, branchId: string, now = Date.now()): CrowdAlert[] {
  const branch = db.branches.find((b) => b.id === branchId);
  if (!branch) return [];
  const alerts: CrowdAlert[] = [];
  const today = db.tickets.filter((t) => t.branchId === branchId && kuwaitDate(t.createdAt) === kuwaitDate(now));
  const line = today.filter((t) => t.status === "WAITING" || t.status === "ARRIVED");
  const hist = branchHistory(db, branchId);
  const p = kuwaitParts(now);
  const expected = hist.byWeekdayHour[p.day][p.h];
  const lastHour = today.filter((t) => now - t.createdAt < 3600_000).length;
  if (lastHour >= 6 && expected > 0 && lastHour > expected * 1.5)
    alerts.push({ kind: "surge", severity: lastHour > expected * 2.2 ? "critical" : "warning", vars: { n: lastHour, expected: Math.round(expected) } });
  for (const t of today.filter((x) => x.status === "IN_SERVICE" && x.startedAt)) {
    const s = db.services.find((x) => x.id === t.serviceId);
    if (!s) continue;
    const avg = serviceMinutes(db, s, branchId);
    const elapsed = (now - t.startedAt!) / 60000;
    if (elapsed > avg * 2 && elapsed > 10) alerts.push({ kind: "slow_service", severity: "warning", vars: { ticket: t.number, mins: Math.round(elapsed) } });
  }
  if (line.length) {
    const last = line[line.length - 1];
    const est = estimateWait(db, branchId, last.serviceId, line.slice(0, -1), now);
    if (est.mid > 45) alerts.push({ kind: "long_wait", severity: est.mid > 90 ? "critical" : "warning", vars: { mins: Math.round(est.mid) } });
  }
  if (line.length >= branch.maxQueue * 0.85) alerts.push({ kind: "near_capacity", severity: "critical", vars: { n: line.length, max: branch.maxQueue } });
  if (isBranchOpen(branch, now) && !db.employees.some((e) => e.branchId === branchId && e.active))
    alerts.push({ kind: "no_staff", severity: "critical", vars: {} });
  return alerts;
}
