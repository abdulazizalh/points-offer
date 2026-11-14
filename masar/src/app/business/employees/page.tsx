"use client";
import { useState } from "react";
import { HeartPulse, Pencil, Plus, Star } from "lucide-react";
import { useBiz } from "@/components/biz/BizShell";
import { Avatar, Badge, Button, Card, Field, Input, Select, Sheet, Toggle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { upsertEmployee } from "@/lib/engine";
import type { Employee } from "@/lib/types";
import { hashString, l, uid } from "@/lib/utils";

export default function Employees() {
  const biz = useBiz()!;
  const { t, db, locale, run } = useStore();
  const [edit, setEdit] = useState<Employee | null>(null);
  const isOwner = biz.user.role === "business_owner";
  const list = db.employees.filter((e) => e.businessId === biz.business.id && e.branchId === biz.branch.id);
  const services = db.services.filter((s) => s.businessId === biz.business.id);
  const blank = (): Employee => ({ id: uid("emp"), businessId: biz.business.id, branchId: biz.branch.id, name: "", title: { en: "", ar: "" }, serviceIds: services.map((s) => s.id), counter: String(list.length + 1), active: true, clinical: false, servedToday: 0, avgServiceMin: 0, rating: 0 });
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{isOwner && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit(blank())}>{t("biz.newEmployee")}</Button>}</div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="border-b border-line bg-bg/60 text-[11.5px] uppercase tracking-wide text-muted">
            <tr>{[t("common.name"), t("biz.emp.counter"), t("biz.emp.services"), t("biz.emp.served"), t("biz.emp.avg"), t("place.rating"), t("common.status"), ""].map((h, i) => <th key={i} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((e) => (
              <tr key={e.id} className="hover:bg-bg/50">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={e.name} hue={hashString(e.id) % 360} size={34} /><div><p className="font-semibold text-navy">{e.name}{e.clinical && <HeartPulse className="ms-1 inline h-3.5 w-3.5 text-error" />}</p><p className="text-[12px] text-muted">{l(e.title, locale)}</p></div></div></td>
                <td className="ltr-nums px-4 py-3 text-navy">{e.counter}</td>
                <td className="px-4 py-3 text-muted">{e.serviceIds.map((id) => l(services.find((s) => s.id === id)?.name, locale)).filter(Boolean).join("، ")}</td>
                <td className="ltr-nums px-4 py-3 font-semibold text-navy">{e.servedToday}</td>
                <td className="ltr-nums px-4 py-3 text-navy">{e.avgServiceMin || "—"}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 ltr-nums"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{e.rating || "—"}</span></td>
                <td className="px-4 py-3">
                  {isOwner ? <Toggle checked={e.active} label={t("common.active")} onChange={(v) => run((d) => upsertEmployee(d, biz.actor, { ...e, active: v }))} /> : <Badge tone={e.active ? "success" : "muted"}>{e.active ? t("common.active") : t("common.inactive")}</Badge>}
                </td>
                <td className="px-4 py-3">{isOwner && <Button size="sm" variant="ghost" aria-label={t("common.edit")} onClick={() => setEdit(structuredClone(e))}><Pencil className="h-4 w-4" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && list.some((x) => x.id === edit.id) ? t("biz.editEmployee") : t("biz.newEmployee")}>
        {edit && (
          <div className="space-y-4">
            <Field label={t("common.name")} htmlFor="en"><Input id="en" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={60} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t("biz.emp.title")} (EN)`} htmlFor="te"><Input id="te" dir="ltr" value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} /></Field>
              <Field label={`${t("biz.emp.title")} (ع)`} htmlFor="ta"><Input id="ta" dir="rtl" value={edit.title.ar} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, ar: e.target.value } })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("biz.emp.counter")} htmlFor="ec"><Input id="ec" dir="ltr" value={edit.counter} maxLength={4} onChange={(e) => setEdit({ ...edit, counter: e.target.value })} /></Field>
              <Field label={t("biz.branch")} htmlFor="eb"><Select id="eb" value={edit.branchId} onChange={(e) => setEdit({ ...edit, branchId: e.target.value })}>{biz.branches.map((b) => <option key={b.id} value={b.id}>{l(b.name, locale)}</option>)}</Select></Field>
            </div>
            <Field label={t("biz.emp.services")}>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const on = edit.serviceIds.includes(s.id);
                  return <button key={s.id} type="button" aria-pressed={on} onClick={() => setEdit({ ...edit, serviceIds: on ? edit.serviceIds.filter((x) => x !== s.id) : [...edit.serviceIds, s.id] })} className={`rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-navy bg-navy text-white" : "border-line text-navy"}`}>{l(s.name, locale)}</button>;
                })}
              </div>
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-bg p-3.5"><span className="text-[13.5px] text-navy">{t("biz.emp.clinical")}</span><Toggle checked={edit.clinical} onChange={(v) => setEdit({ ...edit, clinical: v })} label={t("biz.emp.clinical")} /></div>
            <div className="flex items-center justify-between rounded-2xl bg-bg p-3.5"><span className="text-[14px] text-navy">{t("common.active")}</span><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={t("common.active")} /></div>
            <Button full size="lg" disabled={!edit.name.trim() || edit.serviceIds.length === 0} onClick={() => { const r = run((d) => upsertEmployee(d, biz.actor, { ...edit, name: edit.name.trim() }), t("common.saved")); if (r.ok) setEdit(null); }}>{t("common.save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
