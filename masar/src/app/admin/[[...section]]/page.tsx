"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, Building2, CheckCircle2, EyeOff, Flag, LayoutDashboard, Languages, ListChecks, LogOut, Menu, Pencil, Plus, ScrollText, ShieldCheck, Smartphone, Star, Tags, Ticket, Users, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar, Badge, BizLogo, Button, Card, Field, Input, Select, Sheet, Stars, Toggle } from "@/components/ui";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/domain";
import { Kpi } from "@/components/biz/BizShell";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { actorFor, can, setBusinessVerification, setReportStatus, setReviewHidden, setUserStatus, upsertCategory, type Permission } from "@/lib/engine";
import type { Category, QueueType, User } from "@/lib/types";
import { cn, formatDate, formatDateTime, kuwaitDate, l, maskPhone, relativeTime, uid } from "@/lib/utils";

const SECTIONS: Array<{ key: string; icon: React.ComponentType<{ className?: string }>; label: string; perm?: Permission }> = [
  { key: "", icon: LayoutDashboard, label: "adm.overview", perm: "analytics.view" },
  { key: "businesses", icon: Building2, label: "adm.businesses", perm: "businesses.view" },
  { key: "users", icon: Users, label: "adm.users", perm: "users.view" },
  { key: "categories", icon: Tags, label: "adm.categories", perm: "categories.manage" },
  { key: "reports", icon: Flag, label: "adm.reports", perm: "reports.manage" },
  { key: "reviews", icon: Star, label: "adm.reviews", perm: "reviews.moderate" },
  { key: "audit", icon: ScrollText, label: "adm.audit", perm: "audit.view" },
];

export default function AdminPage() {
  const { db, session, setSession, t } = useStore();
  const admin = db.users.find((u) => u.id === session.adminUserId && u.role === "admin");
  if (!admin) return <AdminLogin />;
  if (admin.status === "suspended") return <div className="p-10 text-center">{t("err.account_suspended")}</div>;
  return <AdminFrame admin={admin} onLogout={() => setSession({ adminUserId: undefined })} />;
}

function AdminLogin() {
  const { t, db, setSession } = useStore();
  const admins = db.users.filter((u) => u.role === "admin");
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <Card className="w-full max-w-md p-7">
        <Logo size={30} />
        <h1 className="mt-5 text-[22px] font-semibold text-navy">{t("adm.console")}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{t("adm.signInAs")} — <Badge tone="warning">{t("demo.short")}</Badge></p>
        <div className="mt-5 space-y-2">
          {admins.map((a) => (
            <button key={a.id} onClick={() => setSession({ adminUserId: a.id })} className="flex w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-start transition hover:border-light hover:bg-bg">
              <Avatar name={a.name} hue={a.avatarHue} size={40} />
              <span className="flex-1"><span className="block text-[14.5px] font-semibold text-navy">{a.name}</span><span className="block text-[12px] text-muted">{t(`adm.role.${a.adminRole}`)}</span></span>
              <ShieldCheck className="h-5 w-5 text-medium" />
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-[12.5px]"><Link href="/home" className="text-medium">{t("biz.toCustomer")}</Link></p>
      </Card>
    </div>
  );
}

function AdminFrame({ admin, onLogout }: { admin: User; onLogout: () => void }) {
  const { t, locale, setSession } = useStore();
  const params = useParams<{ section?: string[] }>();
  const section = params.section?.[0] ?? "";
  const actor = actorFor(admin);
  const [open, setOpen] = useState(false);
  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0];
  const allowed = !current.perm || can(actor, current.perm);

  const side = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Logo size={26} tone="white" /><p className="mt-2 text-[12px] text-light">{t("adm.console")}</p></div>
      <nav className="flex-1 space-y-0.5 px-3">
        {SECTIONS.map((s) => {
          const ok = !s.perm || can(actor, s.perm);
          return (
            <Link key={s.key} href={`/admin/${s.key}`} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition", s.key === section ? "bg-white/12 text-white" : "text-light hover:bg-white/6 hover:text-white", !ok && "opacity-40")}>
              <s.icon className="h-[18px] w-[18px]" /> {t(s.label)}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3 text-[13px]">
        <div className="flex items-center gap-2 px-3 py-2"><Avatar name={admin.name} hue={admin.avatarHue} size={28} /><span className="text-white">{admin.name}<span className="block text-[11px] text-light">{t(`adm.role.${admin.adminRole}`)}</span></span></div>
        <Link href="/home" className="flex items-center gap-3 rounded-xl px-3 py-2 text-light hover:text-white"><Smartphone className="h-4 w-4" />{t("biz.toCustomer")}</Link>
        <button onClick={() => setSession({ locale: locale === "ar" ? "en" : "ar" })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-light hover:text-white"><Languages className="h-4 w-4" />{locale === "ar" ? "English" : "العربية"}</button>
        <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-light hover:text-white"><LogOut className="h-4 w-4" />{t("biz.logout")}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 bg-[#1b2f4d] lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-[#1b2f4d]">{side}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button className="grid h-10 w-10 place-items-center rounded-xl text-navy lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <h1 className="text-[18px] font-semibold text-navy">{t(current.label)}</h1>
          <Badge tone="blue" className="ms-auto">{t(`adm.role.${admin.adminRole}`)}</Badge>
        </header>
        <main className="p-4 lg:p-8">
          {!allowed ? (
            <Card className="p-8 text-center text-[14px] text-muted">{t("adm.noPerm")}</Card>
          ) : section === "" ? <Overview /> : section === "businesses" ? <Businesses admin={admin} /> : section === "users" ? <UsersSection admin={admin} /> : section === "categories" ? <Categories admin={admin} /> : section === "reports" ? <Reports admin={admin} /> : section === "reviews" ? <Reviews admin={admin} /> : <Audit />}
        </main>
      </div>
    </div>
  );
}

function Overview() {
  const { t, db, locale } = useStore();
  const today = kuwaitDate();
  const tickets = db.tickets.filter((x) => kuwaitDate(x.createdAt) === today);
  const byCat = db.categories.map((c) => ({ name: l(c.name, locale).split(" ")[0], value: tickets.filter((x) => db.businesses.find((b) => b.id === x.businessId)?.categoryId === c.id).length }));
  const events = [...db.events].sort((a, b) => b.at - a.at).slice(0, 14);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("adm.kpi.users")} value={db.users.filter((u) => u.role === "customer").length} icon={<Users className="h-4 w-4" />} />
        <Kpi label={t("adm.kpi.businesses")} value={db.businesses.filter((b) => b.verification === "verified").length} icon={<Building2 className="h-4 w-4" />} />
        <Kpi label={t("adm.kpi.pending")} value={db.businesses.filter((b) => b.verification === "pending").length} icon={<ListChecks className="h-4 w-4" />} />
        <Kpi label={t("adm.kpi.ticketsToday")} value={tickets.length} icon={<Ticket className="h-4 w-4" />} />
        <Kpi label={t("adm.kpi.activeQueues")} value={new Set(tickets.filter((x) => ["WAITING", "ARRIVED", "CALLED", "IN_SERVICE"].includes(x.status)).map((x) => x.branchId)).size} icon={<Activity className="h-4 w-4" />} />
        <Kpi label={t("adm.kpi.openReports")} value={db.reports.filter((r) => r.status === "open").length} icon={<Flag className="h-4 w-4" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-navy">{t("adm.byCategory")}</h2>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={byCat} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E1EAF3" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7F95" }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7F95" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(208,225,242,.4)" }} contentStyle={{ borderRadius: 12, border: "1px solid #E1EAF3", fontSize: 12 }} />
                <Bar dataKey="value" name={t("adm.tickets")} fill="#4D79A8" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-navy"><span className="pulse-ring relative h-2 w-2 rounded-full bg-success text-success/50" />{t("adm.activity")}</h2>
          <ul className="divide-y divide-line">
            {events.map((e) => {
              const tk = db.tickets.find((x) => x.id === e.ticketId);
              const b = tk && db.businesses.find((x) => x.id === tk.businessId);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2 text-[13px]">
                  <Badge tone={e.type === "CANCELLED" ? "muted" : e.type === "COMPLETED" ? "success" : "blue"}>{e.type}</Badge>
                  <span className="ltr-nums font-semibold text-navy">{tk?.number}</span>
                  <span className="flex-1 truncate text-muted">{b ? l(b.name, locale) : ""}</span>
                  <span className="text-[11.5px] text-muted">{relativeTime(e.at, locale)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Businesses({ admin }: { admin: User }) {
  const { t, db, locale, run } = useStore();
  const actor = actorFor(admin);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "suspended" | "rejected">("all");
  const [note, setNote] = useState("");
  const list = db.businesses.filter((b) => filter === "all" || b.verification === filter).sort((a, b) => Number(b.verification === "pending") - Number(a.verification === "pending") || b.createdAt - a.createdAt);
  const canVerify = can(actor, "businesses.verify");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "verified", "suspended", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3.5 py-1.5 text-[13px]", filter === f ? "border-navy bg-navy text-white" : "border-line bg-white text-navy")}>
            {f === "all" ? t("common.all") : t(`biz.ver.${f}`)} <span className="ltr-nums opacity-70">({f === "all" ? db.businesses.length : db.businesses.filter((b) => b.verification === f).length})</span>
          </button>
        ))}
        <Input placeholder={t("adm.note")} value={note} onChange={(e) => setNote(e.target.value)} className="!h-9 ms-auto max-w-xs !text-[13px]" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="border-b border-line bg-bg/60 text-[11.5px] uppercase tracking-wide text-muted">
            <tr>{[t("adm.businesses"), t("biz.category"), t("biz.cr"), t("biz.branches"), t("adm.joined"), t("common.status"), t("common.actions")].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((b) => (
              <tr key={b.id} className="hover:bg-bg/50">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><BizLogo initials={b.initials} hue={b.hue} size={34} /><div><p className="font-semibold text-navy">{l(b.name, locale)}</p><p className="text-[11.5px] text-muted">{b.email}{b.isDemo && " · demo"}</p></div></div></td>
                <td className="px-4 py-3 text-muted">{l(db.categories.find((c) => c.id === b.categoryId)?.name, locale)}</td>
                <td className="ltr-nums px-4 py-3 text-muted">{b.crNumber}</td>
                <td className="ltr-nums px-4 py-3 text-navy">{db.branches.filter((x) => x.businessId === b.id).length}</td>
                <td className="px-4 py-3 text-muted">{formatDate(b.createdAt, locale)}</td>
                <td className="px-4 py-3"><Badge tone={b.verification === "verified" ? "success" : b.verification === "pending" ? "warning" : "error"}>{t(`biz.ver.${b.verification}`)}</Badge></td>
                <td className="px-4 py-3">
                  {canVerify && (
                    <div className="flex flex-wrap gap-1.5">
                      {b.verification !== "verified" && <Button size="sm" variant="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => run((d) => setBusinessVerification(d, actor, b.id, "verified", note), t("common.done"))}>{t(b.verification === "suspended" ? "adm.reactivate" : "adm.verify")}</Button>}
                      {b.verification === "pending" && <Button size="sm" variant="outline" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => run((d) => setBusinessVerification(d, actor, b.id, "rejected", note))}>{t("adm.reject")}</Button>}
                      {b.verification === "verified" && admin.adminRole === "super_admin" && <Button size="sm" variant="ghost" className="!text-error" onClick={() => run((d) => setBusinessVerification(d, actor, b.id, "suspended", note))}>{t("adm.suspend")}</Button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function UsersSection({ admin }: { admin: User }) {
  const { t, db, locale, run } = useStore();
  const actor = actorFor(admin);
  const [q, setQ] = useState("");
  const list = db.users.filter((u) => !q || `${u.name} ${u.phone} ${u.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <Input placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="border-b border-line bg-bg/60 text-[11.5px] uppercase tracking-wide text-muted">
            <tr>{[t("common.name"), t("common.phone"), t("adm.role"), t("adm.tickets"), t("adm.joined"), t("common.status"), ""].map((h, i) => <th key={i} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-bg/50">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} hue={u.avatarHue} size={32} /><span className="font-semibold text-navy">{u.name}</span></div></td>
                <td className="ltr-nums px-4 py-3 text-muted" dir="ltr">{admin.adminRole === "super_admin" ? u.phone : maskPhone(u.phone)}</td>
                <td className="px-4 py-3"><Badge tone="muted">{u.role === "admin" ? t(`adm.role.${u.adminRole}`) : u.role.replace("_", " ")}</Badge></td>
                <td className="ltr-nums px-4 py-3 text-navy">{db.tickets.filter((x) => x.userId === u.id).length}</td>
                <td className="px-4 py-3 text-muted">{formatDate(u.createdAt, locale)}</td>
                <td className="px-4 py-3"><Badge tone={u.status === "active" ? "success" : "error"}>{u.status === "active" ? t("common.active") : t("adm.suspend")}</Badge></td>
                <td className="px-4 py-3">
                  {can(actor, "users.suspend") && u.id !== admin.id && (
                    u.status === "active"
                      ? <Button size="sm" variant="ghost" className="!text-error" onClick={() => run((d) => setUserStatus(d, actor, u.id, "suspended", ""))}>{t("adm.suspend")}</Button>
                      : <Button size="sm" variant="outline" onClick={() => run((d) => setUserStatus(d, actor, u.id, "active", ""))}>{t("adm.reactivate")}</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Categories({ admin }: { admin: User }) {
  const { t, db, locale, run } = useStore();
  const actor = actorFor(admin);
  const [edit, setEdit] = useState<Category | null>(null);
  const icons = Object.keys(CATEGORY_ICONS);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ id: uid("cat"), slug: "", name: { en: "", ar: "" }, icon: "ticket", defaultQueueType: "standard", active: true, sort: db.categories.length + 1 })}>{t("adm.newCategory")}</Button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...db.categories].sort((a, b) => a.sort - b.sort).map((c) => (
          <Card key={c.id} className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-pale/60 text-deep"><CategoryIcon icon={c.icon} className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-navy">{l(c.name, locale)}</p>
              <p className="text-[12px] text-muted">{t(`qt.${c.defaultQueueType}`)} · <span className="ltr-nums">{db.businesses.filter((b) => b.categoryId === c.id).length}</span> {t("adm.businesses")}</p>
            </div>
            <Toggle checked={c.active} label={t("common.active")} onChange={(v) => run((d) => upsertCategory(d, actor, { ...c, active: v }))} />
            <Button size="sm" variant="ghost" aria-label={t("common.edit")} onClick={() => setEdit({ ...c })}><Pencil className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={t("adm.categories")}>
        {edit && (
          <div className="space-y-4">
            <Field label={`${t("common.name")} (EN)`} htmlFor="cne"><Input id="cne" dir="ltr" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></Field>
            <Field label={`${t("common.name")} (ع)`} htmlFor="cna"><Input id="cna" dir="rtl" value={edit.name.ar} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ar: e.target.value } })} /></Field>
            <Field label={t("adm.cat.icon")}>
              <div className="flex flex-wrap gap-2">{icons.map((i) => <button key={i} type="button" aria-pressed={edit.icon === i} onClick={() => setEdit({ ...edit, icon: i })} className={cn("grid h-10 w-10 place-items-center rounded-xl border", edit.icon === i ? "border-navy bg-navy text-white" : "border-line text-deep")}><CategoryIcon icon={i} className="h-5 w-5" /></button>)}</div>
            </Field>
            <Field label={t("adm.cat.default")} htmlFor="cqt"><Select id="cqt" value={edit.defaultQueueType} onChange={(e) => setEdit({ ...edit, defaultQueueType: e.target.value as QueueType })}>{(["standard", "appointment", "timed_entry", "walk_in", "healthcare"] as const).map((q) => <option key={q} value={q}>{t(`qt.${q}`)}</option>)}</Select></Field>
            <Button full size="lg" disabled={!edit.name.en.trim()} onClick={() => { const r = run((d) => upsertCategory(d, actor, { ...edit, slug: edit.slug || edit.name.en.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: { en: edit.name.en.trim(), ar: edit.name.ar.trim() || edit.name.en.trim() } }), t("common.saved")); if (r.ok) setEdit(null); }}>{t("common.save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Reports({ admin }: { admin: User }) {
  const { t, db, locale, run } = useStore();
  const actor = actorFor(admin);
  const list = [...db.reports].sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || b.at - a.at);
  return (
    <div className="space-y-3">
      {list.map((r) => {
        const b = r.businessId ? db.businesses.find((x) => x.id === r.businessId) : undefined;
        const u = db.users.find((x) => x.id === r.userId);
        return (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={r.kind === "complaint" ? "warning" : r.kind === "review_flag" ? "blue" : "muted"}>{r.kind}</Badge>
              <Badge tone={r.status === "open" ? "error" : r.status === "resolved" ? "success" : "muted"}>{r.status}</Badge>
              {b && <span className="text-[13px] font-semibold text-navy">{l(b.name, locale)}</span>}
              <span className="ms-auto text-[12px] text-muted">{u?.name ?? r.userId} · {formatDateTime(r.at, locale)}</span>
            </div>
            <p className="mt-2 text-[14px] text-navy">{r.text}</p>
            <div className="mt-3 flex gap-2">
              {r.status === "open" ? (
                <>
                  <Button size="sm" variant="success" onClick={() => run((d) => setReportStatus(d, actor, r.id, "resolved"))}>{t("adm.resolve")}</Button>
                  <Button size="sm" variant="outline" onClick={() => run((d) => setReportStatus(d, actor, r.id, "dismissed"))}>{t("adm.dismiss")}</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => run((d) => setReportStatus(d, actor, r.id, "open"))}>{t("adm.reopen")}</Button>
              )}
              {r.reviewId && <Link href="/admin/reviews" className="inline-flex h-9 items-center px-3 text-[13px] text-medium">{t("adm.reviews")}</Link>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Reviews({ admin }: { admin: User }) {
  const { t, db, locale, run } = useStore();
  const actor = actorFor(admin);
  const flagged = useMemo(() => new Set(db.reports.filter((r) => r.reviewId && r.status === "open").map((r) => r.reviewId)), [db.reports]);
  const list = [...db.reviews].sort((a, b) => Number(flagged.has(b.id)) - Number(flagged.has(a.id)) || b.at - a.at).slice(0, 80);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((r) => (
        <Card key={r.id} className={cn("p-4", r.hidden && "opacity-60", flagged.has(r.id) && "ring-2 ring-warning/40")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-navy">{r.authorName}</span>
            <Stars value={r.rating} size={12} />
          </div>
          <p className="text-[12px] text-muted">{l(db.businesses.find((b) => b.id === r.businessId)?.name, locale)} · {formatDate(r.at, locale)}</p>
          {r.text && <p className="mt-2 text-[13.5px] text-navy">{r.text}</p>}
          <div className="mt-3 flex items-center gap-2">
            {flagged.has(r.id) && <Badge tone="warning"><Flag className="h-3 w-3" />flagged</Badge>}
            {r.hidden && <Badge tone="muted"><EyeOff className="h-3 w-3" />{t("adm.hide")}</Badge>}
            <Button size="sm" variant={r.hidden ? "outline" : "ghost"} className="ms-auto" onClick={() => run((d) => setReviewHidden(d, actor, r.id, !r.hidden))}>{r.hidden ? t("adm.restore") : t("adm.hide")}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Audit() {
  const { db, locale } = useStore();
  const list = [...db.audit].sort((a, b) => b.at - a.at);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-[13px]">
        <thead className="border-b border-line bg-bg/60 text-[11.5px] uppercase tracking-wide text-muted">
          <tr>{["Time", "Actor", "Action", "Target", "Note"].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.map((a) => (
            <tr key={a.id}>
              <td className="ltr-nums whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(a.at, locale)}</td>
              <td className="px-4 py-2.5 text-navy">{a.actorLabel}</td>
              <td className="px-4 py-2.5"><code className="rounded bg-bg px-1.5 py-0.5 text-[12px] text-deep">{a.action}</code></td>
              <td className="px-4 py-2.5 text-navy">{a.target}</td>
              <td className="px-4 py-2.5 text-muted">{a.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

