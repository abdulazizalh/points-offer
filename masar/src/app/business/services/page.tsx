"use client";
import { useState } from "react";
import { Clock, Pencil, Plus } from "lucide-react";
import { useBiz } from "@/components/biz/BizShell";
import { Badge, Button, Card, Field, Input, Select, Sheet, Textarea, Toggle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { upsertService, queueTypeOf } from "@/lib/engine";
import type { QueueType, Service } from "@/lib/types";
import { l, uid } from "@/lib/utils";

const QTYPES: QueueType[] = ["standard", "appointment", "timed_entry", "walk_in", "healthcare"];

export default function Services() {
  const biz = useBiz()!;
  const { t, db, locale, run } = useStore();
  const [edit, setEdit] = useState<Service | null>(null);
  const services = db.services.filter((s) => s.businessId === biz.business.id);
  const isOwner = biz.user.role === "business_owner";
  const blank = (): Service => ({ id: uid("srv"), businessId: biz.business.id, branchIds: biz.branches.map((b) => b.id), name: { en: "", ar: "" }, description: { en: "", ar: "" }, durationMin: 15, prefix: "A", active: true, remoteBooking: true });
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{isOwner && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit(blank())}>{t("biz.newService")}</Button>}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-navy">{l(s.name, locale)}</p>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{l(s.description, locale)}</p>
              </div>
              {isOwner && <Button size="sm" variant="ghost" aria-label={t("common.edit")} onClick={() => setEdit(structuredClone(s))}><Pencil className="h-4 w-4" /></Button>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="blue"><Clock className="h-3 w-3" />{t("service.duration", { n: s.durationMin })}</Badge>
              <Badge tone="muted">{t("biz.svc.prefix")}: <span className="ltr-nums">{s.prefix}</span></Badge>
              <Badge tone="muted">{t(`qt.${queueTypeOf(biz.branch, s)}`)}</Badge>
              <Badge tone={s.active ? "success" : "muted"}>{s.active ? t("biz.svc.active") : t("common.inactive")}</Badge>
              {!s.remoteBooking && <Badge tone="warning">{t("service.remoteOff")}</Badge>}
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && services.some((s) => s.id === edit.id) ? t("biz.editService") : t("biz.newService")} wide>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t("biz.svc.name")} (EN)`} htmlFor="ne"><Input id="ne" dir="ltr" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></Field>
              <Field label={`${t("biz.svc.name")} (ع)`} htmlFor="na"><Input id="na" dir="rtl" value={edit.name.ar} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ar: e.target.value } })} /></Field>
              <Field label={`${t("biz.svc.desc")} (EN)`} htmlFor="de"><Textarea id="de" dir="ltr" className="!min-h-[70px]" value={edit.description.en} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })} /></Field>
              <Field label={`${t("biz.svc.desc")} (ع)`} htmlFor="da"><Textarea id="da" dir="rtl" className="!min-h-[70px]" value={edit.description.ar} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, ar: e.target.value } })} /></Field>
              <Field label={t("biz.svc.duration")} htmlFor="du"><Input id="du" type="number" min={1} max={480} value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: Number(e.target.value) })} /></Field>
              <Field label={t("biz.svc.prefix")} htmlFor="pf"><Input id="pf" dir="ltr" maxLength={2} value={edit.prefix} onChange={(e) => setEdit({ ...edit, prefix: e.target.value.toUpperCase() })} /></Field>
              <Field label={t("biz.svc.queueType")} htmlFor="qt">
                <Select id="qt" value={edit.queueType ?? ""} onChange={(e) => setEdit({ ...edit, queueType: (e.target.value || undefined) as QueueType | undefined })}>
                  <option value="">— {t(`qt.${biz.branch.queueType}`)}</option>
                  {QTYPES.map((q) => <option key={q} value={q}>{t(`qt.${q}`)}</option>)}
                </Select>
              </Field>
              <Field label={`${t("biz.svc.maxQueue")} (${t("common.optional")})`} htmlFor="mq"><Input id="mq" type="number" min={1} value={edit.maxQueue ?? ""} onChange={(e) => setEdit({ ...edit, maxQueue: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            </div>
            <Field label={t("biz.svc.branches")}>
              <div className="flex flex-wrap gap-2">
                {biz.branches.map((b) => {
                  const on = edit.branchIds.includes(b.id);
                  return <button key={b.id} type="button" aria-pressed={on} onClick={() => setEdit({ ...edit, branchIds: on ? edit.branchIds.filter((x) => x !== b.id) : [...edit.branchIds, b.id] })} className={`rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-navy bg-navy text-white" : "border-line text-navy"}`}>{l(b.name, locale)}</button>;
                })}
              </div>
            </Field>
            <div className="flex items-center justify-between rounded-2xl bg-bg p-3.5"><span className="text-[14px] text-navy">{t("biz.svc.remote")}</span><Toggle checked={edit.remoteBooking} onChange={(v) => setEdit({ ...edit, remoteBooking: v })} label={t("biz.svc.remote")} /></div>
            <div className="flex items-center justify-between rounded-2xl bg-bg p-3.5"><span className="text-[14px] text-navy">{t("biz.svc.active")}</span><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={t("biz.svc.active")} /></div>
            <Button full size="lg" disabled={!edit.name.en.trim() && !edit.name.ar.trim()} onClick={() => {
              const s = { ...edit, name: { en: edit.name.en.trim() || edit.name.ar.trim(), ar: edit.name.ar.trim() || edit.name.en.trim() } };
              const r = run((d) => upsertService(d, biz.actor, s), t("common.saved"));
              if (r.ok) setEdit(null);
            }}>{t("common.save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
