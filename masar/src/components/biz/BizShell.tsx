"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { BarChart3, Building, Clock, LayoutDashboard, ListOrdered, LogOut, Menu, Monitor, Smartphone, UserRound, Users, Wrench, X, Languages } from "lucide-react";
import type { Actor, Branch, Business, Employee, User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Badge, BizLogo, Button, Card, Select } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { cn, l } from "@/lib/utils";

export interface BizCtx {
  user: User;
  business: Business;
  branches: Branch[];
  branch: Branch;
  employees: Employee[];
  acting: Employee | undefined;
  actor: Actor;
}

export function useBiz(): BizCtx | null {
  const { db, session } = useStore();
  const user = db.users.find((u) => u.id === session.bizUserId && (u.role === "business_owner" || u.role === "business_staff"));
  const business = user && db.businesses.find((b) => b.id === user.businessId);
  if (!user || !business) return null;
  const branches = db.branches.filter((b) => b.businessId === business.id);
  const branch = branches.find((b) => b.id === session.bizBranchId) ?? branches[0];
  if (!branch) return null;
  const employees = db.employees.filter((e) => e.branchId === branch.id);
  const acting = employees.find((e) => e.id === session.actingEmployeeId);
  return {
    user,
    business,
    branches,
    branch,
    employees,
    acting,
    actor: { id: user.id, role: user.role, businessId: business.id, clinical: acting?.clinical ?? false },
  };
}

const NAV = [
  { href: "/business", icon: LayoutDashboard, key: "biz.overview" },
  { href: "/business/queue", icon: ListOrdered, key: "biz.queue" },
  { href: "/business/services", icon: Wrench, key: "biz.services" },
  { href: "/business/employees", icon: Users, key: "biz.employees" },
  { href: "/business/branches", icon: Building, key: "biz.branches" },
  { href: "/business/analytics", icon: BarChart3, key: "biz.analytics" },
];

export function BizShell({ children }: { children: React.ReactNode }) {
  const biz = useBiz();
  const path = usePathname();
  if (path === "/business/register") return <>{children}</>;
  if (!biz) return <BizLogin />;
  return <BizFrame biz={biz}>{children}</BizFrame>;
}

function BizFrame({ biz, children }: { biz: BizCtx; children: React.ReactNode }) {
  const { t, locale, setSession, mode } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const verTone = biz.business.verification === "verified" ? "success" : biz.business.verification === "pending" ? "warning" : "error";

  const side = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <BizLogo initials={biz.business.initials} hue={biz.business.hue} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white">{l(biz.business.name, locale)}</p>
          <Badge tone={verTone} className="mt-1">{t(`biz.ver.${biz.business.verification}`)}</Badge>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, icon: Icon, key }) => {
          const on = path === href;
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition", on ? "bg-white/12 text-white" : "text-light hover:bg-white/6 hover:text-white")}>
              <Icon className="h-[18px] w-[18px]" /> {t(key)}
            </Link>
          );
        })}
        <a href={`/display/${biz.branch.id}`} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-light hover:bg-white/6 hover:text-white">
          <Monitor className="h-[18px] w-[18px]" /> {t("biz.display")}
        </a>
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href="/home" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-light hover:text-white"><Smartphone className="h-4 w-4" />{t("biz.toCustomer")}</Link>
        <button onClick={() => setSession({ locale: locale === "ar" ? "en" : "ar" })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-light hover:text-white"><Languages className="h-4 w-4" />{locale === "ar" ? "English" : "العربية"}</button>
        <button onClick={() => { setSession({ bizUserId: undefined, actingEmployeeId: undefined }); router.push("/business"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-light hover:text-white"><LogOut className="h-4 w-4" />{t("biz.logout")}</button>
      </div>
      <div className="px-5 pb-5"><Logo size={22} tone="white" /></div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 bg-navy lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 animate-slide-up bg-navy">{side}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button className="grid h-10 w-10 place-items-center rounded-xl text-navy hover:bg-bg lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <h1 className="text-[18px] font-semibold text-navy">{t(NAV.find((n) => n.href === path)?.key ?? "biz.dashboard")}</h1>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {mode === "demo" && biz.business.isDemo && <Badge tone="warning">{t("demo.badge")}</Badge>}
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <Building className="h-4 w-4" />
              <Select aria-label={t("biz.branch")} value={biz.branch.id} onChange={(e) => setSession({ bizBranchId: e.target.value, actingEmployeeId: undefined })} className="!h-9 !w-auto !rounded-xl !py-0 !text-[13px]">
                {biz.branches.map((b) => <option key={b.id} value={b.id}>{l(b.name, locale)}</option>)}
              </Select>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <UserRound className="h-4 w-4" />
              <Select aria-label={t("biz.actingAs")} value={biz.acting?.id ?? ""} onChange={(e) => setSession({ actingEmployeeId: e.target.value || undefined })} className="!h-9 !w-auto !rounded-xl !py-0 !text-[13px]">
                <option value="">{biz.user.name}</option>
                {biz.employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name} · {t("biz.emp.counter")} {e.counter}</option>)}
              </Select>
            </label>
          </div>
        </header>
        {biz.business.verification !== "verified" && (
          <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-[#fdf6ea] p-3.5 text-[13px] text-[#8a5b12] lg:mx-8"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{t("biz.pendingNote")}</div>
        )}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function BizLogin() {
  const { t, setSession, db, locale } = useStore();
  const owners = db.users.filter((u) => u.role === "business_owner" && db.businesses.find((b) => b.id === u.businessId));
  const [other, setOther] = useState("");
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy to-deep p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo size={36} tone="white" showAr />
        <div>
          <h2 className="text-[34px] font-semibold leading-tight">{t("app.tagline")}</h2>
          <p className="mt-3 max-w-md text-[15px] text-light">{t("biz.loginSub")}</p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[["biz.kpi.active", "12"], ["biz.kpi.avgWait", "14m"], ["biz.kpi.rating", "4.8"]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10"><p className="text-[22px] font-semibold ltr-nums">{v}</p><p className="text-[11px] text-light">{t(k)}</p></div>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-light/70">© MASAR</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-7">
          <div className="lg:hidden"><Logo size={30} /></div>
          <h1 className="mt-4 text-[24px] font-semibold text-navy lg:mt-0">{t("biz.loginTitle")}</h1>
          <p className="mt-1 text-[14px] text-muted">{t("biz.loginSub")}</p>
          <button onClick={() => setSession({ bizUserId: "u_owner_oasis", bizBranchId: undefined, actingEmployeeId: undefined })} className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-navy bg-navy p-4 text-start text-white shadow-card transition hover:bg-deep">
            <BizLogo initials="OG" hue={212} size={44} />
            <span className="flex-1"><span className="block text-[15px] font-semibold">{t("biz.demoLogin")}</span><span className="block text-[12px] text-light">{t("biz.demoLoginSub")}</span></span>
            <Badge tone="white">{t("demo.short")}</Badge>
          </button>
          <div className="mt-4 flex gap-2">
            <Select aria-label="Other demo business" value={other} onChange={(e) => setOther(e.target.value)} className="!h-11 flex-1 !text-[13px]">
              <option value="">{locale === "ar" ? "منشأة تجريبية أخرى…" : "Another demo business…"}</option>
              {owners.map((u) => { const b = db.businesses.find((x) => x.id === u.businessId)!; return <option key={u.id} value={u.id}>{l(b.name, locale)}</option>; })}
            </Select>
            <Button variant="outline" disabled={!other} onClick={() => setSession({ bizUserId: other, bizBranchId: undefined, actingEmployeeId: undefined })}>{t("common.continue")}</Button>
          </div>
          <div className="my-6 flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-line" />{t("common.or")}<span className="h-px flex-1 bg-line" /></div>
          <Button variant="secondary" size="lg" full href="/business/register">{t("biz.register")}</Button>
          <p className="mt-6 text-center text-[12.5px]"><Link href="/home" className="text-medium">{t("biz.toCustomer")}</Link></p>
        </Card>
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-[12.5px] text-muted">{label}{icon && <span className="text-medium">{icon}</span>}</div>
      <p className="ltr-nums mt-2 text-[26px] font-semibold leading-none text-navy">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-muted">{sub}</p>}
    </Card>
  );
}

export function XIcon() {
  return <X className="h-4 w-4" />;
}
