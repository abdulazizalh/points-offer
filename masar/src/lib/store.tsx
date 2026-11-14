"use client";
// Client data layer. In demo mode it persists to localStorage and syncs across tabs
// with BroadcastChannel, so the customer app, business dashboard and TV display
// update each other in real time. In Supabase mode the same API is backed by
// RPC calls + Supabase Realtime (see lib/supabase/backend.ts).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Actor, DB, ErrorCode, Locale, Result, User } from "./types";
import { createSeed, DB_VERSION } from "./seed";
import { compactDemo, ensureDemoToday, simulateTick } from "./demo";
import { actorFor } from "./engine";
import { translate } from "./i18n";
import { DATA_MODE } from "./config";

const DB_KEY = `masar.db.v${DB_VERSION}`;
const SESSION_KEY = "masar.session.v1";
const CHANNEL = "masar-sync";

// ───────────── persistent store ─────────────

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage full or blocked: keep in memory */
  }
}

class DemoStore {
  private db: DB | null = null;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private memoryRaw: string | null = null;

  init() {
    if (this.db) return;
    this.db = this.read() ?? createSeed();
    const changed = ensureDemoToday(this.db);
    compactDemo(this.db);
    if (changed || !safeGet(DB_KEY)) this.write(this.db);
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = () => this.reload();
    }
    window.addEventListener("storage", (e) => {
      if (e.key === DB_KEY) this.reload();
    });
  }

  private read(): DB | null {
    const raw = safeGet(DB_KEY) ?? this.memoryRaw;
    if (!raw) return null;
    try {
      const db = JSON.parse(raw) as DB;
      return db.version === DB_VERSION ? db : null;
    } catch {
      return null;
    }
  }

  private write(db: DB) {
    const raw = JSON.stringify(db);
    this.memoryRaw = raw;
    safeSet(DB_KEY, raw);
  }

  private reload() {
    const fresh = this.read();
    if (fresh) {
      this.db = fresh;
      this.emit();
    }
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): DB | null => this.db;

  /** Transaction: re-read latest state, apply, persist, broadcast. */
  mutate<T>(fn: (db: DB) => Result<T>): Result<T> {
    const db = this.read() ?? this.db ?? createSeed();
    const r = fn(db);
    if (r.ok) {
      this.write(db);
      this.db = db;
      this.channel?.postMessage("changed");
      this.emit();
    }
    return r;
  }

  /** Silent mutate for background jobs. */
  touch(fn: (db: DB) => boolean) {
    const db = this.read() ?? this.db;
    if (!db) return;
    if (fn(db)) {
      this.write(db);
      this.db = db;
      this.channel?.postMessage("changed");
      this.emit();
    }
  }

  reset() {
    try {
      localStorage.removeItem(DB_KEY);
    } catch {}
    this.memoryRaw = null;
    this.db = createSeed();
    ensureDemoToday(this.db);
    this.write(this.db);
    this.channel?.postMessage("changed");
    this.emit();
  }
}

export const store = new DemoStore();

// ───────────── device session (who is signed in on this device) ─────────────

export interface DeviceSession {
  userId?: string;
  bizUserId?: string;
  bizBranchId?: string;
  actingEmployeeId?: string;
  adminUserId?: string;
  locale: Locale;
  onboarded: boolean;
  simulator: boolean;
  areaId: string;
  gps?: { lat: number; lng: number };
  showFirstName: boolean;
}

const defaultSession: DeviceSession = { locale: "ar", onboarded: false, simulator: true, areaId: "salmiya", showFirstName: true };

function readSession(): DeviceSession {
  try {
    const raw = safeGet(SESSION_KEY);
    return raw ? { ...defaultSession, ...JSON.parse(raw) } : defaultSession;
  } catch {
    return defaultSession;
  }
}

// ───────────── toasts ─────────────

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}

// ───────────── context ─────────────

interface Ctx {
  ready: boolean;
  db: DB;
  session: DeviceSession;
  setSession: (patch: Partial<DeviceSession>) => void;
  user: User | undefined;
  actor: Actor;
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Record<string, string | number>) => string;
  run: <T>(fn: (db: DB) => Result<T>, success?: string) => Result<T>;
  toast: (text: string, kind?: Toast["kind"]) => void;
  toasts: Toast[];
  errorText: (e: ErrorCode) => string;
  online: boolean;
  resetDemo: () => void;
  mode: "demo" | "supabase";
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSessionState] = useState<DeviceSession>(defaultSession);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(true);
  const toastId = useRef(0);

  useEffect(() => {
    store.init();
    setSessionState(readSession());
    setReady(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setSessionState(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const db = useSyncExternalStore(store.subscribe, store.getSnapshot, () => null);

  const setSession = useCallback((patch: Partial<DeviceSession>) => {
    setSessionState((prev) => {
      const next = { ...prev, ...patch };
      safeSet(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const locale = session.locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500);
  }, []);

  const errorText = useCallback((e: ErrorCode) => t(`err.${e}`), [t]);

  const run = useCallback(
    <T,>(fn: (db: DB) => Result<T>, success?: string): Result<T> => {
      const r = store.mutate(fn);
      if (!r.ok) toast(errorText(r.error), "error");
      else if (success) toast(success, "success");
      return r;
    },
    [toast, errorText],
  );

  const user = db?.users.find((u) => u.id === session.userId);
  const actor = useMemo(() => actorFor(user), [user]);

  // Demo simulator — one tab leads to avoid double-advancing queues.
  useEffect(() => {
    if (!ready || DATA_MODE !== "demo") return;
    const me = Math.random().toString(36).slice(2);
    const LEADER = "masar.sim.leader";
    const tick = () => {
      const s = readSession();
      ensureDemoTodayIfNeeded();
      if (!s.simulator) return;
      const now = Date.now();
      try {
        const cur = JSON.parse(localStorage.getItem(LEADER) || "null") as { id: string; at: number } | null;
        if (cur && cur.id !== me && now - cur.at < 15000) return;
        localStorage.setItem(LEADER, JSON.stringify({ id: me, at: now }));
      } catch {}
      store.touch((d) => simulateTick(d, now));
    };
    const iv = setInterval(tick, 4000);
    return () => clearInterval(iv);
  }, [ready]);

  // Notification fan-out for pending channels.
  useNotificationDispatch(db, locale);

  const resetDemo = useCallback(() => {
    store.reset();
    setSession({ userId: undefined, bizUserId: undefined, adminUserId: undefined, actingEmployeeId: undefined });
  }, [setSession]);

  const value: Ctx | null = db
    ? { ready, db, session, setSession, user, actor, locale, dir, t, run, toast, toasts, errorText, online, resetDemo, mode: DATA_MODE }
    : null;

  if (!value) return <BootScreen />;
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function ensureDemoTodayIfNeeded() {
  store.touch((d) => ensureDemoToday(d));
}

function BootScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[var(--navy)]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Loading" />
    </div>
  );
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

// ───────────── notification channels ─────────────

function useNotificationDispatch(db: DB | null, locale: Locale) {
  const inflight = useRef(new Set<string>());
  const channelStatus = useRef<{ sms: boolean; whatsapp: boolean } | null>(null);

  useEffect(() => {
    if (!db) return;
    const pending = db.notifications.filter(
      (n) => !inflight.current.has(n.id) && (n.delivery.push === "pending" || n.delivery.sms === "pending" || n.delivery.whatsapp === "pending"),
    );
    if (!pending.length) return;
    pending.forEach((n) => inflight.current.add(n.id));

    (async () => {
      if (!channelStatus.current) {
        try {
          const r = await fetch("/api/notify", { method: "GET" });
          channelStatus.current = r.ok ? await r.json() : { sms: false, whatsapp: false };
        } catch {
          channelStatus.current = { sms: false, whatsapp: false };
        }
      }
      const ch = channelStatus.current ?? { sms: false, whatsapp: false };
      for (const n of pending) {
        const title = translate(locale, `notif.${n.type}.t`);
        const place = locale === "ar" ? n.vars.placeAr : n.vars.placeEn;
        const body = translate(locale, `notif.${n.type}.b`, { ...n.vars, place: String(place ?? "") });
        let push = n.delivery.push;
        if (push === "pending") {
          push = "failed";
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              const reg = await navigator.serviceWorker?.getRegistration();
              if (reg) await reg.showNotification(title, { body, icon: "/icons/icon-192.png", tag: n.ticketId, data: { url: n.ticketId ? `/queue/${n.ticketId}` : "/notifications" } });
              else new Notification(title, { body, icon: "/icons/icon-192.png" });
              push = "sent";
            }
          } catch {
            push = "failed";
          }
        }
        let sms = n.delivery.sms;
        let whatsapp = n.delivery.whatsapp;
        if (sms === "pending" || whatsapp === "pending") {
          const wantSms = sms === "pending" && ch.sms;
          const wantWa = whatsapp === "pending" && ch.whatsapp;
          if (sms === "pending" && !ch.sms) sms = "not_configured";
          if (whatsapp === "pending" && !ch.whatsapp) whatsapp = "not_configured";
          if (wantSms || wantWa) {
            try {
              const r = await fetch("/api/notify", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ notificationId: n.id, userId: n.userId, channels: { sms: wantSms, whatsapp: wantWa }, title, body }),
              });
              const res = (await r.json()) as { sms?: string; whatsapp?: string };
              if (wantSms) sms = (res.sms as typeof sms) ?? "failed";
              if (wantWa) whatsapp = (res.whatsapp as typeof whatsapp) ?? "failed";
            } catch {
              if (wantSms) sms = "failed";
              if (wantWa) whatsapp = "failed";
            }
          }
        }
        store.touch((d) => {
          const x = d.notifications.find((y) => y.id === n.id);
          if (!x) return false;
          x.delivery = { ...x.delivery, push, sms, whatsapp };
          return true;
        });
      }
    })();
  }, [db, locale]);
}
