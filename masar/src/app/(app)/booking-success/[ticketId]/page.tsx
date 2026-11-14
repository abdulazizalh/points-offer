"use client";
import { useParams } from "next/navigation";
import { Check, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/store";
import { peopleAhead, ticketEstimate } from "@/lib/engine";
import { formatTime, l } from "@/lib/utils";

export default function BookingSuccess() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t, db, locale } = useStore();
  const tk = db.tickets.find((x) => x.id === ticketId);
  if (!tk) return <div className="p-10 text-center text-muted">{t("ticket.notFound")}</div>;
  const biz = db.businesses.find((b) => b.id === tk.businessId)!;
  const svc = db.services.find((s) => s.id === tk.serviceId);
  const est = ticketEstimate(db, tk);
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-white to-bg px-6 pb-8 pt-16 sm:min-h-[calc(100dvh-3rem)]">
      <div className="flex flex-1 flex-col items-center text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/20" />
          <span className="relative grid h-24 w-24 animate-pop place-items-center rounded-full bg-success text-white shadow-[0_12px_40px_rgba(39,150,107,0.35)]">
            <Check className="h-12 w-12" strokeWidth={2.6} />
          </span>
        </div>
        <h1 className="mt-8 animate-slide-up text-[26px] font-semibold text-navy">{t("success.title")}</h1>
        <p className="mt-2 animate-slide-up text-[14.5px] text-muted [animation-delay:.1s]">{t("success.sub")}</p>
        <div className="mt-8 w-full animate-slide-up rounded-[24px] border border-line bg-white p-6 shadow-card [animation-delay:.2s]">
          <p className="text-[12px] uppercase tracking-wider text-muted">{t("ticket.number")}</p>
          <p className="ltr-nums mt-1 text-[52px] font-bold leading-none tracking-tight text-navy">{tk.number}</p>
          <p className="mt-3 text-[14px] font-medium text-navy">{l(biz.name, locale)}</p>
          <p className="text-[13px] text-muted">{l(svc?.name, locale)}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-dashed border-line pt-4">
            {tk.slotStart ? (
              <div className="col-span-2">
                <p className="text-[11.5px] text-muted">{t("ticket.slot")}</p>
                <p className="ltr-nums text-[20px] font-bold text-navy">{formatTime(tk.slotStart, locale)}</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="flex items-center justify-center gap-1 text-[11.5px] text-muted"><Users className="h-3.5 w-3.5" />{t("ticket.ahead")}</p>
                  <p className="ltr-nums text-[22px] font-bold text-navy">{peopleAhead(db, tk)}</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 text-[11.5px] text-muted"><Clock className="h-3.5 w-3.5" />{t("ticket.estimate")}</p>
                  <p className="text-[20px] font-bold text-navy"><span className="ltr-nums">{est.low}–{est.high}</span> <span className="text-[12px] text-muted">{t("common.min")}</span></p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-2.5">
        <Button size="lg" full href={`/queue/${tk.id}`}>{t("success.view")}</Button>
        <Button size="lg" variant="ghost" full href="/home">{t("success.home")}</Button>
      </div>
    </div>
  );
}
