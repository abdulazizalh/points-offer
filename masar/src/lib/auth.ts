"use client";
// Authentication. Demo mode verifies a fixed, clearly-labelled OTP locally.
// Supabase mode uses Supabase Auth phone OTP / email+password.
import type { DB, Locale, Result, User } from "./types";
import { DATA_MODE, DEMO_OTP } from "./config";
import { store } from "./store";
import { normalizeKuwaitPhone, uid } from "./utils";
import { supabase } from "./supabase/client";

export interface PendingAuth {
  mode: "login" | "signup";
  phone: string;
  name?: string;
  email?: string;
  locale?: Locale;
  next?: string;
  sentAt: number;
}

const KEY = "masar.pendingAuth";

export function savePending(p: PendingAuth) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
export function readPending(): PendingAuth | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingAuth) : null;
  } catch {
    return null;
  }
}
export function clearPending() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`masar:${text}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function findCustomerByPhone(db: DB, phone: string): User | undefined {
  const p = normalizeKuwaitPhone(phone);
  return db.users.find((u) => u.phone === p && u.role === "customer");
}

/** Step 1: request an OTP. */
export async function requestOtp(phone: string): Promise<Result> {
  if (DATA_MODE === "supabase") {
    const { error } = await supabase().auth.signInWithOtp({ phone: normalizeKuwaitPhone(phone) });
    return error ? { ok: false, error: "network" } : { ok: true, data: undefined };
  }
  return { ok: true, data: undefined };
}

/** Step 2: verify OTP, then sign in or create the profile. Returns the user id. */
export async function verifyOtp(p: PendingAuth, code: string): Promise<Result<string> | { ok: false; error: "bad_code" }> {
  if (DATA_MODE === "supabase") {
    const { data, error } = await supabase().auth.verifyOtp({ phone: normalizeKuwaitPhone(p.phone), token: code, type: "sms" });
    if (error || !data.user) return { ok: false, error: "bad_code" };
    if (p.mode === "signup") {
      await supabase().from("profiles").upsert({ id: data.user.id, full_name: p.name, email: p.email || null, locale: p.locale ?? "ar" });
    }
    return { ok: true, data: data.user.id };
  }
  if (code !== DEMO_OTP) return { ok: false, error: "bad_code" };
  const phone = normalizeKuwaitPhone(p.phone);
  const r = store.mutate<string>((db) => {
    const existing = db.users.find((u) => u.phone === phone && u.role === "customer");
    if (existing) {
      if (existing.status === "suspended") return { ok: false, error: "account_suspended" };
      return { ok: true, data: existing.id };
    }
    if (p.mode === "login") return { ok: false, error: "not_found" };
    const user: User = {
      id: uid("usr"),
      name: (p.name ?? "").trim(),
      phone,
      email: p.email?.trim() || undefined,
      locale: p.locale ?? "ar",
      role: "customer",
      avatarHue: Math.floor(Math.random() * 360),
      status: "active",
      createdAt: Date.now(),
      savedLocations: [],
      prefs: { inApp: true, push: false, sms: false, whatsapp: false, approachingAt: 3 },
    };
    db.users.push(user);
    return { ok: true, data: user.id };
  });
  return r;
}

export async function passwordLogin(email: string, password: string): Promise<Result<string>> {
  if (DATA_MODE === "supabase") {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    return error || !data.user ? { ok: false, error: "not_found" } : { ok: true, data: data.user.id };
  }
  const hash = await sha256(password);
  const db = store.getSnapshot();
  const u = db?.users.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase() && x.role === "customer");
  if (!u || !u.passwordHash || u.passwordHash !== hash) return { ok: false, error: "not_found" };
  if (u.status === "suspended") return { ok: false, error: "account_suspended" };
  return { ok: true, data: u.id };
}

export async function setPasswordForEmail(email: string, password: string): Promise<Result> {
  if (DATA_MODE === "supabase") {
    const { error } = await supabase().auth.updateUser({ password });
    return error ? { ok: false, error: "network" } : { ok: true, data: undefined };
  }
  const hash = await sha256(password);
  return store.mutate((db) => {
    const u = db.users.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase());
    if (u) u.passwordHash = hash;
    return { ok: true, data: undefined }; // don't reveal whether the email exists
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (DATA_MODE === "supabase") {
    await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset` });
  }
}
