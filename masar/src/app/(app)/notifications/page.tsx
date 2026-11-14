"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CalendarCheck, CheckCheck, CircleSlash, Clock, Megaphone, MapPinCheck, PartyPopper, Settings2, Timer, Users, XCircle } from "lucide-react";
import { EmptyState, IconButton, PageHeader } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { useStore, store } from "@/lib/store";
import type { NotificationType } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  BOOKING_CONFIRMED: CalendarCheck,
  QUEUE_UPDATED: Users,
  TURN_APPROACHING: Clock,
  FIVE_AHEAD: Users,
  TURN_NEXT: BellRing,
  CONFIRM_ARRIVAL: MapPinCheck,
  CALLED: Megaphone,
  BOOKING_CANCELLED: XCircle,
  SERVICE_COMPLETED: PartyPopper,
  POSTPONED: Timer,
  SKIPPED: CircleSlash,
};

export default function Notifications() {
  const { t, db, session, locale } = useStore();
  const router = useRouter();
  const list = db.notifications.filter((n) => n.userId === session.userId).sort((a, b) => b.at - a.at);
  const unread = list.some((n) => !n.read);
  const markAll = () =>
    store.mutate((d) => {
      d.notifications.forEach((n) => n.userId === session.userId && (n.read = true));
      return { ok: true, data: undefined };
    });
  const open = (id: string, href: string) => {
    store.mutate((d) => {
      const n = d.notifications.find((x) => x.id === id);
      if (n) n.read = true;
      return { ok: true, data: undefined };
    });
    router.push(href);
  };
  return (
    <RequireUser>
      <div className="animate-fade-in">
        <PageHeader
          back={false}
          title={t("notif.title")}
          right={
            <div className="flex items-center">
              {unread && <IconButton label={t("notif.markAll")} onClick={markAll}><CheckCheck className="h-5 w-5" /></IconButton>}
              <IconButton label={t("notif.settings")} href="/notifications/settings"><Settings2 className="h-5 w-5" /></IconButton>
            </div>
          }
        />
        {list.length === 0 ? (
          <EmptyState icon={<Bell className="h-9 w-9" />} title={t("notif.empty")} sub={t("notif.emptySub")} />
        ) : (
          <ul className="space-y-2 px-5 pb-6">
            {list.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const place = String(locale === "ar" ? n.vars.placeAr : n.vars.placeEn);
              const href = n.type === "SERVICE_COMPLETED" && n.ticketId ? `/review/${n.ticketId}` : n.ticketId ? `/queue/${n.ticketId}` : "/notifications";
              const urgent = n.type === "CALLED" || n.type === "TURN_NEXT";
              return (
                <li key={n.id}>
                  <button onClick={() => open(n.id, href)} className={cn("flex w-full gap-3 rounded-2xl border p-3.5 text-start transition hover:bg-white", n.read ? "border-transparent bg-transparent" : "border-line/70 bg-white shadow-soft")}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", urgent ? "bg-success/10 text-success" : n.type === "BOOKING_CANCELLED" || n.type === "SKIPPED" ? "bg-error/10 text-error" : "bg-pale/60 text-deep")}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("text-[14px] text-navy", !n.read && "font-semibold")}>{t(`notif.${n.type}.t`)}</span>
                        <span className="shrink-0 text-[11px] text-muted">{relativeTime(n.at, locale)}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{t(`notif.${n.type}.b`, { ...n.vars, place })}</span>
                      <span className="mt-1.5 flex flex-wrap gap-x-3 text-[10.5px] text-muted/80">
                        <span>{t("nset.push")}: {t(`delivery.${n.delivery.push}`)}</span>
                        <span>SMS: {t(`delivery.${n.delivery.sms}`)}</span>
                        <span>WhatsApp: {t(`delivery.${n.delivery.whatsapp}`)}</span>
                      </span>
                    </span>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-medium" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-5 pb-6 text-center text-[12px]"><Link href="/notifications/settings" className="text-medium">{t("notif.settings")}</Link></p>
      </div>
    </RequireUser>
  );
}
