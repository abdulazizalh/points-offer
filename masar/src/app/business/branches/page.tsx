"use client";
import { useState } from "react";
import { MapPin, Monitor, Pencil, Plus, QrCode } from "lucide-react";
import { useBiz } from "@/components/biz/BizShell";
import { Badge, Button, Card, Field, Input, Select, Sheet, Toggle } from "@/components/ui";
import { QrCode as QR } from "@/components/domain";
import { useStore } from "@/lib/store";
import { upsertBranch } from "@/lib/engine";
import type { Branch, QueueType } from "@/lib/types";
import { checkinCode, isBranchOpen, l } from "@/lib/utils";

const DAYS = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] };
const QTYPES: QueueType[] = ["standard", "appointment", "timed_entry", "walk_in", "healthcare"];

export default function Branches() {
  const biz = useBiz()!;
  const { t, db, locale, run, setSession } = useStore();
  const [edit, setEdit] = useState<Branch | null>(null);
  const isOwner = biz.user.role === "business_owner";
  const blank = (): Branch => {
    const area = db.areas[0];
    return { id: `br_new_${Math.random().toString(36).slice(2, 10)}`, businessId: biz.business.id, name: { en: "", ar: "" }, areaId: area.id, address: { en: "", ar: "" }, lat: area.lat, lng: area.lng, phone: biz.business.phone, hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "09:00", close: "21:00", closed: day === 5 })), active: true, queueType: biz.branch.queueType, remoteBooking: true, allowPostpone: true, postponePositions: 3, maxQueue: 50, checkinSecret: "", slotMinutes: 30, slotCapacity: 10 };
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{isOwner && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit(blank())}>{t("biz.newBranch")}</Button>}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        {biz.branches.map((b) => {
          const area = db.areas.find((a) => a.id === b.areaId);
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          return (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[16px] font-semibold text-navy">{l(b.name, locale)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted"><MapPin className="h-3.5 w-3.5" />{l(b.address, locale)}, {l(area?.name, locale)}</p>
                </div>
                <div className="flex gap-1">
                  <Badge tone={isBranchOpen(b) ? "success" : "muted"} dot>{isBranchOpen(b) ? t("common.open") : t("common.closed")}</Badge>
                  {isOwner && <Button size="sm" variant="ghost" aria-label={t("common.edit")} onClick={() => setEdit(structuredClone(b))}><Pencil className="h-4 w-4" /></Button>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="blue">{t(`qt.${b.queueType}`)}</Badge>
                <Badge tone={b.remoteBooking ? "success" : "warning"}>{t("biz.br.remote")}: {b.remoteBooking ? t("common.yes") : t("common.no")}</Badge>
                <Badge tone="muted">{t("biz.br.allowPostpone").split(" ").slice(0, 3).join(" ")}: {b.allowPostpone ? `${b.postponePositions}` : t("common.no")}</Badge>
                <Badge tone="muted">{t("biz.br.maxQueue")}: <span className="ltr-nums">{b.maxQueue}</span></Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-bg p-3">
                <div className="rounded-xl bg-white p-1.5"><QR value={`${origin}/place/${b.id}/services?onsite=1&code=${checkinCode(b.checkinSecret)}`} size={76} /></div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-navy"><QrCode className="h-4 w-4 text-medium" />{t("biz.br.checkin")}</p>
                  <p className="font-mono text-[18px] font-bold tracking-[0.3em] text-navy">{checkinCode(b.checkinSecret)}</p>
                  <p className="text-[11.5px] text-muted">{t("biz.br.checkinSub")}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSession({ bizBranchId: b.id })}>{t("biz.queue")}</Button>
                <a href={`/display/${b.id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-navy hover:bg-bg"><Monitor className="h-4 w-4" />{t("biz.display")}</a>
              </div>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && biz.branches.some((b) => b.id === edit.id) ? t("biz.editBranch") : t("biz.newBranch")} wide>
        {edit && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t("common.name")} (EN)`} htmlFor="bne"><Input id="bne" dir="ltr" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></Field>
              <Field label={`${t("common.name")} (ع)`} htmlFor="bna"><Input id="bna" dir="rtl" value={edit.name.ar} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ar: e.target.value } })} /></Field>
              <Field label={t("biz.area")} htmlFor="bar">
                <Select id="bar" value={edit.areaId} onChange={(e) => { const a = db.areas.find((x) => x.id === e.target.value)!; setEdit({ ...edit, areaId: a.id, lat: a.lat, lng: a.lng }); }}>
                  {db.areas.map((a) => <option key={a.id} value={a.id}>{l(a.name, locale)}</option>)}
                </Select>
              </Field>
              <Field label={t("biz.address")} htmlFor="bad"><Input id="bad" value={edit.address[locale]} onChange={(e) => setEdit({ ...edit, address: { en: e.target.value, ar: e.target.value } })} /></Field>
              <Field label={t("common.phone")} htmlFor="bph"><Input id="bph" dir="ltr" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label={t("biz.svc.queueType")} htmlFor="bqt"><Select id="bqt" value={edit.queueType} onChange={(e) => setEdit({ ...edit, queueType: e.target.value as QueueType })}>{QTYPES.map((q) => <option key={q} value={q}>{t(`qt.${q}`)}</option>)}</Select></Field>
            </div>
            <section>
              <h3 className="mb-2 text-[14px] font-semibold text-navy">{t("biz.br.hours")}</h3>
              <div className="space-y-2">
                {edit.hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2">
                    <span className="w-20 text-[13px] text-navy">{DAYS[locale][h.day]}</span>
                    <input type="time" aria-label="open" disabled={h.closed} value={h.open} onChange={(e) => { const hours = [...edit.hours]; hours[i] = { ...h, open: e.target.value }; setEdit({ ...edit, hours }); }} className="h-9 rounded-lg border border-line bg-white px-2 text-[13px] disabled:opacity-40" />
                    <span className="text-muted">–</span>
                    <input type="time" aria-label="close" disabled={h.closed} value={h.close} onChange={(e) => { const hours = [...edit.hours]; hours[i] = { ...h, close: e.target.value }; setEdit({ ...edit, hours }); }} className="h-9 rounded-lg border border-line bg-white px-2 text-[13px] disabled:opacity-40" />
                    <label className="ms-auto flex items-center gap-2 text-[12px] text-muted">{t("biz.br.closedDay")}<Toggle checked={h.closed} label={t("biz.br.closedDay")} onChange={(v) => { const hours = [...edit.hours]; hours[i] = { ...h, closed: v }; setEdit({ ...edit, hours }); }} /></label>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="text-[14px] font-semibold text-navy">{t("biz.br.policy")}</h3>
              <div className="flex items-center justify-between rounded-2xl bg-bg p-3.5"><span className="text-[13.5px] text-navy">{t("biz.br.remote")}</span><Toggle checked={edit.remoteBooking} onChange={(v) => setEdit({ ...edit, remoteBooking: v })} label={t("biz.br.remote")} /></div>
              <div className="flex items-center justify-between rounded-2xl bg-bg p-3.5"><span className="text-[13.5px] text-navy">{t("biz.br.allowPostpone")}</span><Toggle checked={edit.allowPostpone} onChange={(v) => setEdit({ ...edit, allowPostpone: v })} label={t("biz.br.allowPostpone")} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("biz.br.positions")} htmlFor="bpp"><Input id="bpp" type="number" min={1} max={20} disabled={!edit.allowPostpone} value={edit.postponePositions} onChange={(e) => setEdit({ ...edit, postponePositions: Number(e.target.value) })} /></Field>
                <Field label={t("biz.br.maxQueue")} htmlFor="bmq"><Input id="bmq" type="number" min={1} max={500} value={edit.maxQueue} onChange={(e) => setEdit({ ...edit, maxQueue: Number(e.target.value) })} /></Field>
                {(edit.queueType === "timed_entry" || edit.queueType === "appointment") && (
                  <>
                    <Field label={t("biz.br.slotMinutes")} htmlFor="bsm"><Input id="bsm" type="number" min={5} value={edit.slotMinutes ?? 30} onChange={(e) => setEdit({ ...edit, slotMinutes: Number(e.target.value) })} /></Field>
                    <Field label={t("biz.br.slotCapacity")} htmlFor="bsc"><Input id="bsc" type="number" min={1} value={edit.slotCapacity ?? 10} onChange={(e) => setEdit({ ...edit, slotCapacity: Number(e.target.value) })} /></Field>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-bg p-3.5"><span className="text-[13.5px] text-navy">{t("common.active")}</span><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={t("common.active")} /></div>
            </section>
            <Button full size="lg" disabled={!edit.name.en.trim() && !edit.name.ar.trim()} onClick={() => {
              const b = { ...edit, name: { en: edit.name.en.trim() || edit.name.ar.trim(), ar: edit.name.ar.trim() || edit.name.en.trim() } };
              const r = run((d) => upsertBranch(d, biz.actor, b), t("common.saved"));
              if (r.ok) setEdit(null);
            }}>{t("common.save")}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
