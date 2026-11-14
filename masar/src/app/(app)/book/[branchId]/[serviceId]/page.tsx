"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Building2, Camera, Clock, Info, QrCode, Smartphone, Users } from "lucide-react";
import { BizLogo, Button, Card, DemoBadge, Field, Input, PageHeader } from "@/components/ui";
import { QrScanner } from "@/components/QrScanner";
import { useStore } from "@/lib/store";
import { branchLine, createTicket, queueTypeOf, slotsFor } from "@/lib/engine";
import { estimateWait } from "@/lib/intelligence";
import { cn, formatTime, isBranchOpen, l } from "@/lib/utils";

function BookInner() {
  const { branchId, serviceId } = useParams<{ branchId: string; serviceId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { t, db, locale, run, actor, user } = useStore();
  const branch = db.branches.find((b) => b.id === branchId);
  const service = db.services.find((s) => s.id === serviceId);
  const [channel, setChannel] = useState<"remote" | "onsite_qr">(params.get("onsite") === "1" || (branch && !branch.remoteBooking) ? "onsite_qr" : "remote");
  const [code, setCode] = useState(params.get("code") ?? "");
  const [slot, setSlot] = useState<number | null>(null);
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);

  const line = useMemo(() => (branch ? branchLine(db, branch.id) : []), [db, branch]);
  if (!branch || !service) return <PageHeader title={t("place.notFound")} />;
  const biz = db.businesses.find((b) => b.id === branch.businessId)!;
  const qt = queueTypeOf(branch, service);
  const slotted = qt === "timed_entry" || qt === "appointment";
  const est = estimateWait(db, branch.id, service.id, line);
  const slots = slotted ? slotsFor(db, branch, service) : [];
  const policyText = branch.allowPostpone && !slotted ? t("book.policy") : t("book.policyNoPostpone");
  const canRemote = branch.remoteBooking && service.remoteBooking && qt !== "walk_in";

  const confirm = () => {
    if (!user) return router.push(`/auth/login?next=${encodeURIComponent(`/book/${branch.id}/${service.id}`)}`);
    setBusy(true);
    const r = run((d) => createTicket(d, actor, { branchId: branch.id, serviceId: service.id, channel, checkinCode: code, slotStart: slot ?? undefined }));
    setBusy(false);
    if (r.ok) router.replace(`/booking-success/${r.data.id}`);
  };

  const disabled = (slotted && slot === null) || (channel === "onsite_qr" && code.trim().length < 6) || (!slotted && !isBranchOpen(branch));

  return (
    <div className="animate-fade-in pb-32">
      <PageHeader title={t("book.title")} right={biz.isDemo ? <DemoBadge /> : undefined} />
      <div className="space-y-4 px-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BizLogo initials={biz.initials} hue={biz.hue} size={48} />
            <div className="min-w-0">
              <p className="text-[12px] text-muted">{t("book.place")}</p>
              <p className="truncate text-[15px] font-semibold text-navy">{l(biz.name, locale)} · {l(branch.name, locale)}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-bg p-3">
              <dt className="text-[11.5px] text-muted">{t("book.service")}</dt>
              <dd className="mt-0.5 text-[14px] font-semibold text-navy">{l(service.name, locale)}</dd>
            </div>
            <div className="rounded-2xl bg-bg p-3">
              <dt className="text-[11.5px] text-muted">{t("book.type")}</dt>
              <dd className="mt-0.5 text-[14px] font-semibold text-navy">{t(`qt.${qt}`)}</dd>
            </div>
            {!slotted && (
              <>
                <div className="rounded-2xl bg-bg p-3">
                  <dt className="flex items-center gap-1 text-[11.5px] text-muted"><Users className="h-3.5 w-3.5" />{t("book.ahead")}</dt>
                  <dd className="ltr-nums mt-0.5 text-[22px] font-bold text-navy">{line.length}</dd>
                </div>
                <div className="rounded-2xl bg-navy p-3 text-white">
                  <dt className="flex items-center gap-1 text-[11.5px] text-light"><Clock className="h-3.5 w-3.5" />{t("book.estimate")}</dt>
                  <dd className="mt-0.5 text-[20px] font-bold"><span className="ltr-nums">{est.low}–{est.high}</span> <span className="text-[13px] font-medium text-light">{t("common.min")}</span></dd>
                </div>
              </>
            )}
          </dl>
          {!slotted && <p className="mt-3 text-[11.5px] leading-relaxed text-muted">{t("ticket.estimateNote", { c: t(`ticket.conf.${est.confidence}`) })}</p>}
        </Card>

        {slotted && (
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("book.slot")}</h2>
            {slots.filter((s) => !s.past).length === 0 ? (
              <Card className="p-4 text-[13px] text-muted">{t("book.noSlots")}</Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.filter((s) => !s.past).map((s) => {
                  const left = s.capacity - s.booked;
                  const full = left <= 0;
                  return (
                    <button
                      key={s.start}
                      disabled={full}
                      onClick={() => setSlot(s.start)}
                      aria-pressed={slot === s.start}
                      className={cn(
                        "rounded-2xl border p-2.5 text-center transition disabled:opacity-40",
                        slot === s.start ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-light",
                      )}
                    >
                      <span className="ltr-nums block text-[14px] font-semibold">{formatTime(s.start, locale)}</span>
                      <span className={cn("block text-[11px]", slot === s.start ? "text-light" : left <= 3 ? "text-warning" : "text-muted")}>{full ? t("book.slotFull") : t("book.slotLeft", { n: left })}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("book.how")}</h2>
          <div className="grid gap-2.5">
            {canRemote && (
              <button onClick={() => setChannel("remote")} aria-pressed={channel === "remote"} className={cn("flex items-start gap-3 rounded-2xl border p-4 text-start transition", channel === "remote" ? "border-navy bg-white ring-4 ring-pale/60" : "border-line bg-white")}>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", channel === "remote" ? "bg-navy text-white" : "bg-bg text-deep")}><Smartphone className="h-5 w-5" /></span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-navy">{t("book.remote")}</span>
                  <span className="block text-[12.5px] text-muted">{t("book.remoteSub")}</span>
                </span>
              </button>
            )}
            <button onClick={() => setChannel("onsite_qr")} aria-pressed={channel === "onsite_qr"} className={cn("flex items-start gap-3 rounded-2xl border p-4 text-start transition", channel === "onsite_qr" ? "border-navy bg-white ring-4 ring-pale/60" : "border-line bg-white")}>
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", channel === "onsite_qr" ? "bg-navy text-white" : "bg-bg text-deep")}><Building2 className="h-5 w-5" /></span>
              <span>
                <span className="block text-[14.5px] font-semibold text-navy">{t("book.onsite")}</span>
                <span className="block text-[12.5px] text-muted">{t("book.onsiteSub")}</span>
              </span>
            </button>
          </div>
          {channel === "onsite_qr" && (
            <div className="mt-3 animate-slide-up space-y-2">
              <Field label={t("book.code")} hint={t("book.codeHint")} htmlFor="code">
                <div className="flex gap-2">
                  <Input id="code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} className="text-center font-mono text-[18px] tracking-[0.4em]" placeholder="••••••" autoCapitalize="characters" />
                  <Button variant="outline" className="!h-12 shrink-0" onClick={() => setScan(true)} aria-label={t("arrive.scan")} icon={<Camera className="h-5 w-5" />} />
                </div>
              </Field>
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted"><Info className="mt-0.5 h-4 w-4 shrink-0 text-medium" />{policyText}</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[460px] border-t border-line bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur sm:absolute sm:rounded-b-[36px]">
        <Button size="lg" full onClick={confirm} loading={busy} disabled={!!user && disabled} icon={channel === "onsite_qr" ? <QrCode className="h-5 w-5" /> : undefined}>
          {user ? t("book.cta") : t("book.loginNeeded")}
        </Button>
      </div>
      <QrScanner open={scan} onClose={() => setScan(false)} onCode={(c) => { setCode(c); setScan(false); }} />
    </div>
  );
}

export default function BookPage() {
  return <Suspense><BookInner /></Suspense>;
}
