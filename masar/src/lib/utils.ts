import type { Branch, L10n, Locale } from "./types";

export const KUWAIT_TZ = "Asia/Kuwait";

export function uid(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export function l(v: L10n | undefined, locale: Locale): string {
  if (!v) return "";
  return v[locale] || v.en || v.ar;
}

/** Kuwait-local parts (UTC+3, no DST). */
export function kuwaitParts(ts = Date.now()) {
  const d = new Date(ts + 3 * 3600_000);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    day: d.getUTCDay(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

export function kuwaitDate(ts = Date.now()): string {
  const p = kuwaitParts(ts);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Epoch ms for a Kuwait-local HH:MM on the Kuwait-local date of `ts`. */
export function kuwaitTimeToday(hhmm: string, ts = Date.now()): number {
  const p = kuwaitParts(ts);
  const [h, m] = hhmm.split(":").map(Number);
  return Date.UTC(p.y, p.m - 1, p.d, h - 3, m);
}

export function isBranchOpen(branch: Branch, ts = Date.now()): boolean {
  const p = kuwaitParts(ts);
  const today = branch.hours.find((h) => h.day === p.day);
  if (!today || today.closed) return false;
  const minutes = p.h * 60 + p.min;
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  const open = oh * 60 + om;
  let close = ch * 60 + cm;
  if (close <= open) close += 24 * 60; // past midnight
  const m2 = minutes < open ? minutes + 24 * 60 : minutes;
  return m2 >= open && m2 < close;
}

export function formatTime(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: KUWAIT_TZ,
    numberingSystem: "latn",
  }).format(ts);
}

export function formatDate(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: KUWAIT_TZ,
    numberingSystem: "latn",
  }).format(ts);
}

export function formatDateTime(ts: number, locale: Locale): string {
  return `${formatDate(ts, locale)} · ${formatTime(ts, locale)}`;
}

export function relativeTime(ts: number, locale: Locale, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  const diff = Math.round((ts - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return locale === "ar" ? "الآن" : "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

/** Deterministic PRNG for demo data. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const CHECKIN_WINDOW_MS = 5 * 60_000;

/**
 * Rotating on-site check-in code. Shown only on the branch's in-store display
 * (and printed QR). Customers must be physically present to read it, which
 * prevents remote "I'm here" confirmations. Accepts current + previous window.
 */
export function checkinCode(secret: string, ts = Date.now()): string {
  const window = Math.floor(ts / CHECKIN_WINDOW_MS);
  const h = hashString(`${secret}:${window}`);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  let x = h;
  for (let i = 0; i < 6; i++) {
    out += alphabet[x % alphabet.length];
    x = (Math.floor(x / alphabet.length) ^ hashString(out + secret)) >>> 0;
  }
  return out;
}

export function verifyCheckinCode(secret: string, code: string, ts = Date.now()): boolean {
  const c = code.trim().toUpperCase();
  return c === checkinCode(secret, ts) || c === checkinCode(secret, ts - CHECKIN_WINDOW_MS);
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "—";
  return parts.map((p, i) => (i === 0 ? p : p[0] + ".")).join(" ");
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `•••• ${digits.slice(-4)}`;
}

export function roundTo(n: number, step: number): number {
  return Math.max(0, Math.round(n / step) * step);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Kuwait mobile numbers: 8 digits starting with 4, 5, 6 or 9. */
export function isValidKuwaitPhone(input: string): boolean {
  const d = input.replace(/\D/g, "").replace(/^965/, "");
  return /^[4569]\d{7}$/.test(d);
}

export function normalizeKuwaitPhone(input: string): string {
  const d = input.replace(/\D/g, "").replace(/^965/, "");
  return `+965${d}`;
}
