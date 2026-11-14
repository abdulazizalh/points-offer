"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ban, BellRing, Camera, CheckCircle2, CircleSlash, Clock4, Frown, MapPinCheck, PartyPopper, QrCode, RotateCcw, Star, Ticket as TicketIcon, Timer } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, PageHeader, Sheet } from "@/components/ui";
import { QrCode as QR } from "@/components/domain";
import { QrScanner } from "@/components/QrScanner";
import { TicketCard } from "@/components/TicketCard";
import { DemoCodeHint } from "@/components/DemoCodeHint";
import { RequireUser } from "@/components/AppFrame";
import { useStore } from "@/lib/store";
import { cancelTicket, confirmArrival, peopleAhead, postponeTicket, ticketEstimate } from "@/lib/engine";
import { serviceMinutes } from "@/lib/intelligence";
import { cn, formatTime, l } from "@/lib/utils";

export default function TicketPage() {
  return (
    <RequireUser>
      <TicketInner />
    </RequireUser>
  );
}

function TicketInner() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const router = useRouter();
  const { t, db, locale, run, actor, session } = useStore();
  const tk = db.tickets.find((x) => x.id === ticketId);
  const [arriveOpen, setArriveOpen] = useState(false);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [code, setCode] = useState("");
  const [scan, setScan] = useState(false);
  const prevStatus = useRef(tk?.status);

  // Vibrate when called
  useEffect(() => {
    if (tk && prevStatus.current !== tk.status && tk.status === "CALLED") navigator.vibrate?.([200, 100, 200]);
    prevStatus.current = tk?.status;
  }, [tk]);

  if (!tk || tk.userId !== session.userId)
    return (
      <div>
        <PageHeader />
        <EmptyState icon={<TicketIcon className="h-9 w-9" />} title={t("ticket.notFound")} action={<Button href="/queue">{t("myq.title")}</Button>} />
      </div>
    );

  const biz = db.businesses.find((b) => b.id === tk.businessId)!;
  const branch = db.branches.find((b) => b.id === tk.branchId)!;
  const svc = db.services.find((s) => s.id === tk.serviceId)!;
  const inLine = tk.status === "WAITING" || tk.status === "ARRIVED";
  const canArrive = (tk.status === "WAITING" || tk.status === "CALLED") && !tk.arrivedAt;
  const canPostpone = branch.allowPostpone && !tk.postponed && ["WAITING", "ARRIVED", "CALLED"].includes(tk.status) && tk.queueType !== "timed_entry" && tk.queueType !== "appointment";
  const canCancel = ["WAITING", "ARRIVED", "CALLED"].includes(tk.status);
  const ahead = peopleAhead(db, tk);
  const est = ticketEstimate(db, tk);
  const postponeMins = Math.round(branch.postponePositions * serviceMinutes(db, svc, branch.id));
  const events = db.events.filter((e) => e.ticketId === tk.id).sort((a, b) => a.at - b.at);

  const doArrive = (c: string) => {
    const r = run((d) => confirmArrival(d, actor, tk.id, c), t("arrive.success"));
    if (r.ok) {
      setArriveOpen(false);
      setCode("");
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("myq.title")} backHref="/queue" />
      <div className="space-y-4 px-5">
        {tk.status === "COMPLETED" ? (
          <Outcome icon={<PartyPopper className="h-9 w-9" />} tone="success" title={t("ticket.completedTitle")} sub={t("ticket.completedSub")}>
            {tk.reviewed ? (
              <p className="flex items-center justify-center gap-1.5 text-[14px] font-medium text-success"><CheckCircle2 className="h-4 w-4" />{t("ticket.rated")}</p>
            ) : (
              <Button size="lg" full href={`/review/${tk.id}`} icon={<Star className="h-5 w-5" />}>{t("ticket.rate")}</Button>
            )}
            <Button variant="ghost" full href={`/place/${tk.branchId}`} className="mt-2">{t("ticket.bookAgain")}</Button>
          </Outcome>
        ) : tk.status === "CANCELLED" ? (
          <Outcome icon={<Ban className="h-9 w-9" />} tone="muted" title={t("ticket.cancelledTitle")} sub={`${tk.number} · ${l(biz.name, locale)}`}>
            <Button size="lg" full href={`/place/${tk.branchId}`} icon={<RotateCcw className="h-5 w-5" />}>{t("ticket.bookAgain")}</Button>
          </Outcome>
        ) : tk.status === "SKIPPED" ? (
          <Outcome icon={<CircleSlash className="h-9 w-9" />} tone="warning" title={t("ticket.skippedTitle")} sub={t("ticket.skippedSub")} />
        ) : tk.status === "NO_SHOW" ? (
          <Outcome icon={<Frown className="h-9 w-9" />} tone="muted" title={t("ticket.noShowTitle")} sub={`${tk.number} · ${l(biz.name, locale)}`}>
            <Button size="lg" full href={`/place/${tk.branchId}`}>{t("ticket.bookAgain")}</Button>
          </Outcome>
        ) : (
          <TicketCard ticket={tk} />
        )}

        {tk.status === "CALLED" && (
          <div className="flex animate-pop items-center gap-3 rounded-[20px] bg-success p-4 text-white shadow-[0_10px_30px_rgba(39,150,107,0.3)]" role="alert">
            <BellRing className="h-7 w-7 shrink-0 animate-bounce" />
            <div>
              <p className="text-[16px] font-semibold">{t("ticket.calledTitle")}</p>
              <p className="text-[13px] text-white/85">{t(tk.arrivedAt ? "ticket.calledSub" : "ticket.calledArriveSub", { c: tk.counter ?? "1" })}</p>
            </div>
          </div>
        )}

        {(inLine || tk.status === "CALLED") && (
          <div className="grid gap-2.5">
            {canArrive && (
              <Button size="lg" full onClick={() => setArriveOpen(true)} icon={<MapPinCheck className="h-5 w-5" />}>{t("ticket.confirmArrival")}</Button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Button size="lg" variant="outline" onClick={() => setPostponeOpen(true)} disabled={!canPostpone} icon={<Timer className="h-5 w-5" />} className="text-[13.5px]">
                {tk.postponed ? t("ticket.postponed") : t("ticket.postpone")}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setCancelOpen(true)} disabled={!canCancel} className="text-[13.5px] !text-error" icon={<Ban className="h-5 w-5" />}>
                {t("ticket.cancel")}
              </Button>
            </div>
          </div>
        )}

        {["WAITING", "ARRIVED", "CALLED", "IN_SERVICE"].includes(tk.status) && (
          <Card className="flex items-center gap-4 p-4">
            <div className="rounded-2xl border border-line p-1.5"><QR value={`masar:ticket:${tk.id}`} size={92} /></div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-navy"><QrCode className="h-4 w-4 text-medium" />{t("ticket.showStaff")}</p>
              <p className="ltr-nums mt-1 text-[22px] font-bold text-navy">{tk.number}</p>
              <p className="text-[12px] text-muted">{l(svc.name, locale)}</p>
            </div>
          </Card>
        )}

        <Card className="divide-y divide-line">
          <Row label={t("ticket.booked")} value={formatTime(tk.createdAt, locale)} />
          {inLine && !tk.slotStart && (
            <Row label={t("ticket.arriveBy")} value={est.low <= 10 ? t("common.now") : formatTime(Date.now() + (est.low - 10) * 60e3, locale)} />
          )}
          {tk.slotStart && <Row label={t("ticket.slot")} value={formatTime(tk.slotStart, locale)} />}
          <Row label={t("book.type")} value={t(`qt.${tk.queueType}`)} />
          {tk.counter && <Row label={t("display.counter")} value={tk.counter} />}
        </Card>

        {events.length > 0 && (
          <Card className="p-4">
            <ol className="relative space-y-3 ps-5">
              <span className="absolute bottom-2 start-[5px] top-2 w-px bg-line" />
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={cn("absolute -start-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white", e.type === "CANCELLED" || e.type === "SKIPPED" ? "bg-muted" : e.type === "COMPLETED" ? "bg-success" : "bg-medium")} />
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="font-medium text-navy">{e.to ? t(`status.${e.to}`) : e.type}{e.type === "POSTPONED" ? ` · ${t("ticket.postponed")}` : ""}</span>
                    <span className="ltr-nums text-muted">{formatTime(e.at, locale)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      {/* Arrival */}
      <Sheet open={arriveOpen} onClose={() => setArriveOpen(false)} title={t("arrive.title")}>
        <p className="text-[13.5px] leading-relaxed text-muted">{t("arrive.sub")}</p>
        <div className="mt-5 space-y-3">
          <Button variant="secondary" size="lg" full onClick={() => setScan(true)} icon={<Camera className="h-5 w-5" />}>{t("arrive.scan")}</Button>
          <DemoCodeHint branchId={tk.branchId} onUse={setCode} />
          <Field label={t("arrive.enter")} hint={t("book.codeHint")} htmlFor="arrcode">
            <Input id="arrcode" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} className="text-center font-mono text-[20px] tracking-[0.4em]" placeholder="••••••" />
          </Field>
          <Button size="lg" full disabled={code.length < 6} onClick={() => doArrive(code)}>{t("common.confirm")}</Button>
          <div className="flex items-center gap-3 rounded-2xl bg-bg p-3">
            <QR value={`masar:ticket:${tk.id}`} size={64} />
            <p className="text-[12.5px] text-muted">{t("ticket.showStaff")}</p>
          </div>
        </div>
      </Sheet>
      <QrScanner open={scan} onClose={() => setScan(false)} onCode={(c) => { setScan(false); doArrive(c); }} />

      <ConfirmDialog
        open={postponeOpen}
        onClose={() => setPostponeOpen(false)}
        icon={<Clock4 className="h-7 w-7" />}
        title={t("postpone.title")}
        body={t("postpone.body", { n: branch.postponePositions, mins: postponeMins })}
        confirmLabel={t("postpone.confirm")}
        onConfirm={() => {
          const r = run((d) => postponeTicket(d, actor, tk.id), t("postpone.done"));
          if (r.ok) setPostponeOpen(false);
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        danger
        icon={<Ban className="h-7 w-7" />}
        title={t("cancel.title")}
        body={t("cancel.body", { ticket: tk.number })}
        confirmLabel={t("cancel.confirm")}
        cancelLabel={t("cancel.keep")}
        onConfirm={() => {
          const r = run((d) => cancelTicket(d, actor, tk.id), t("cancel.done"));
          if (r.ok) {
            setCancelOpen(false);
            router.refresh();
          }
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-[13.5px]">
      <span className="text-muted">{label}</span>
      <span className="ltr-nums font-semibold text-navy">{value}</span>
    </div>
  );
}

function Outcome({ icon, title, sub, tone, children }: { icon: React.ReactNode; title: string; sub?: string; tone: "success" | "muted" | "warning"; children?: React.ReactNode }) {
  return (
    <Card className="animate-slide-up p-6 text-center">
      <div className={cn("mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full", tone === "success" ? "bg-success/10 text-success" : tone === "warning" ? "bg-warning/15 text-[#a8711a]" : "bg-[#eef3f8] text-muted")}>{icon}</div>
      <h2 className="mt-4 text-[20px] font-semibold text-navy">{title}</h2>
      {sub && <p className="mt-1.5 text-[14px] text-muted">{sub}</p>}
      {children && <div className="mt-6">{children}</div>}
    </Card>
  );
}
