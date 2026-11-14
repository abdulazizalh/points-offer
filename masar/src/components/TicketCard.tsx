"use client";
import Link from "next/link";
import { BadgeCheck, CalendarClock, ChevronRight, Clock, HeartPulse, MapPin, Users } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { useStore } from "@/lib/store";
import { nowServing, peopleAhead, ticketEstimate } from "@/lib/engine";
import { cn, formatTime, l } from "@/lib/utils";
import { BizLogo, DemoBadge } from "./ui";
import { StatusBadge } from "./domain";

export function queueProgress(db: ReturnType<typeof useStore>["db"], tk: Ticket): number {
  if (["CALLED", "IN_SERVICE", "COMPLETED"].includes(tk.status)) return 1;
  const before = db.tickets.filter((x) => x.sessionId === tk.sessionId && x.id !== tk.id && x.sortKey < tk.sortKey && x.createdAt <= tk.createdAt && x.status !== "CANCELLED");
  const total = before.length + 1;
  const ahead = peopleAhead(db, tk);
  return Math.min(0.97, Math.max(0.04, (total - ahead - 1 + 0.5) / total));
}

export function TicketCard({ ticket: tk, compact }: { ticket: Ticket; compact?: boolean }) {
  const { t, db, locale } = useStore();
  const biz = db.businesses.find((b) => b.id === tk.businessId)!;
  const branch = db.branches.find((b) => b.id === tk.branchId)!;
  const svc = db.services.find((s) => s.id === tk.serviceId);
  const ahead = peopleAhead(db, tk);
  const est = ticketEstimate(db, tk);
  const serving = nowServing(db, tk.branchId)[0]?.number ?? "—";
  const inLine = tk.status === "WAITING" || tk.status === "ARRIVED";
  const progress = queueProgress(db, tk);

  const card = (
    <article className="overflow-hidden rounded-[26px] bg-white shadow-card ring-1 ring-line/70">
      {/* top */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy via-[#2b4a75] to-deep px-5 pb-6 pt-5 text-white">
        <div className="absolute -end-10 -top-12 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <BizLogo initials={biz.initials} hue={biz.hue} size={40} className="ring-2 ring-white/20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{l(biz.name, locale)}</p>
            <p className="flex items-center gap-1 truncate text-[12px] text-light"><MapPin className="h-3 w-3" />{l(branch.name, locale)}</p>
          </div>
          {inLine && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-pale">
              <span className="pulse-ring relative h-2 w-2 rounded-full bg-success text-success/60" />
              {t("ticket.live")}
            </span>
          )}
          {biz.isDemo && <DemoBadge className="border-white/30 bg-white/90" />}
        </div>
        <div className="relative mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-light">{t("ticket.number")}</p>
            <p className="ltr-nums mt-1 text-[48px] font-bold leading-none tracking-tight">{tk.number}</p>
            <p className="mt-2 text-[13px] text-pale">{l(svc?.name, locale)}</p>
          </div>
          <div className="text-end">
            <p className="text-[11px] text-light">{t("ticket.serving")}</p>
            <p className="ltr-nums text-[22px] font-semibold">{serving}</p>
          </div>
        </div>
      </div>
      {/* perforation */}
      <div className="relative h-0">
        <div className="absolute -start-3 -top-3 h-6 w-6 rounded-full bg-bg" />
        <div className="absolute -end-3 -top-3 h-6 w-6 rounded-full bg-bg" />
        <div className="absolute inset-x-5 top-0 border-t-2 border-dashed border-line" />
      </div>
      {/* bottom */}
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={tk.status} />
          <div className="flex gap-1.5">
            {tk.arrivedAt && <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-success"><BadgeCheck className="h-3.5 w-3.5" />{t("ticket.arrived")}</span>}
            {tk.priority && <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-error"><HeartPulse className="h-3.5 w-3.5" />{t("ticket.priority")}</span>}
          </div>
        </div>
        {tk.slotStart ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-bg p-3.5">
            <CalendarClock className="h-5 w-5 text-medium" />
            <div>
              <p className="text-[11.5px] text-muted">{t("ticket.slot")}</p>
              <p className="ltr-nums text-[18px] font-bold text-navy">{formatTime(tk.slotStart, locale)}</p>
            </div>
          </div>
        ) : inLine ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-bg p-3.5">
                <p className="flex items-center gap-1 text-[11.5px] text-muted"><Users className="h-3.5 w-3.5" />{t("ticket.ahead")}</p>
                <p className="ltr-nums mt-1 text-[28px] font-bold leading-none text-navy">{ahead}</p>
              </div>
              <div className="rounded-2xl bg-bg p-3.5">
                <p className="flex items-center gap-1 text-[11.5px] text-muted"><Clock className="h-3.5 w-3.5" />{t("ticket.estimate")}</p>
                <p className="mt-1 text-[22px] font-bold leading-none text-navy">
                  {est.high <= 2 ? t("common.now") : <><span className="ltr-nums">{est.low}–{est.high}</span> <span className="text-[12px] font-medium text-muted">{t("common.min")}</span></>}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11.5px] text-muted">
                <span>{t("ticket.progress")}</span>
                {ahead === 0 && <span className="font-semibold text-success">{t("ticket.youAreNext")}</span>}
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-pale/60" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-navy transition-all duration-700 rtl:bg-gradient-to-l" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </>
        ) : tk.status === "CALLED" ? (
          <div className="mt-4 rounded-2xl bg-success/10 p-4 text-center">
            <p className="text-[17px] font-semibold text-success">{t("ticket.calledTitle")}</p>
            <p className="mt-1 text-[13px] text-navy">{t(tk.arrivedAt ? "ticket.calledSub" : "ticket.calledArriveSub", { c: tk.counter ?? "1" })}</p>
          </div>
        ) : tk.status === "IN_SERVICE" ? (
          <div className="mt-4 rounded-2xl bg-pale/50 p-4 text-center text-[15px] font-semibold text-deep">{t("ticket.inService")}</div>
        ) : null}
        {compact && (
          <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted">
            <span>{t("ticket.booked")} <span className="ltr-nums text-navy">{formatTime(tk.createdAt, locale)}</span></span>
            <ChevronRight className="rtl-flip h-4 w-4" />
          </div>
        )}
      </div>
    </article>
  );
  return compact ? <Link href={`/queue/${tk.id}`} className={cn("block transition hover:-translate-y-0.5")}>{card}</Link> : card;
}
