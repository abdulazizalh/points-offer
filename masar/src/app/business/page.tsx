"use client";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Gauge, ListOrdered, Star, Timer, UserX, Users } from "lucide-react";
import { useBiz, Kpi } from "@/components/biz/BizShell";
import { Badge, Button, Card, Stars } from "@/components/ui";
import { StatusBadge } from "@/components/domain";
import { useStore } from "@/lib/store";
import { todayStats } from "@/lib/analytics";
import { detectAlerts } from "@/lib/intelligence";
import { branchLine, nowServing } from "@/lib/engine";
import { cn, formatDate, l, maskName } from "@/lib/utils";

export default function Overview() {
  const biz = useBiz()!;
  const { t, db, locale } = useStore();
  const s = todayStats(db, [biz.branch.id]);
  const alerts = detectAlerts(db, biz.branch.id);
  const serving = nowServing(db, biz.branch.id);
  const line = branchLine(db, biz.branch.id);
  const reviews = db.reviews.filter((r) => r.businessId === biz.business.id && !r.hidden).sort((a, b) => b.at - a.at).slice(0, 4);
  const label = (tk: (typeof line)[number]) => tk.guestLabel ?? maskName(db.users.find((u) => u.id === tk.userId)?.name ?? "—");
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label={t("biz.kpi.customers")} value={s.customers} icon={<Users className="h-4 w-4" />} />
        <Kpi label={t("biz.kpi.active")} value={s.active} icon={<ListOrdered className="h-4 w-4" />} />
        <Kpi label={t("biz.kpi.completed")} value={s.completed} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Kpi label={t("biz.kpi.avgWait")} value={<>{s.avgWait}<span className="text-[14px] text-muted"> {t("common.min")}</span></>} icon={<Clock className="h-4 w-4" />} />
        <Kpi label={t("biz.kpi.avgService")} value={<>{s.avgService}<span className="text-[14px] text-muted"> {t("common.min")}</span></>} icon={<Timer className="h-4 w-4" />} />
        <Kpi label={t("biz.kpi.noShow")} value={`${s.noShowRate}%`} icon={<UserX className="h-4 w-4" />} />
        <Kpi label={t("biz.kpi.rating")} value={s.rating ? s.rating.toFixed(1) : "—"} sub={s.ratingCount ? t("place.reviews", { n: s.ratingCount }) : undefined} icon={<Star className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-navy">{t("biz.queue")}</h2>
            <Button size="sm" href="/business/queue" icon={<ArrowRight className="rtl-flip h-4 w-4" />}>{t("biz.queue")}</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{t("biz.serving")}</p>
              {serving.length === 0 ? <p className="rounded-2xl bg-bg p-4 text-[13px] text-muted">{t("biz.emptyServing")}</p> : (
                <ul className="space-y-2">
                  {serving.map((tk) => (
                    <li key={tk.id} className="flex items-center justify-between rounded-2xl bg-navy px-4 py-3 text-white">
                      <span className="ltr-nums text-[20px] font-bold">{tk.number}</span>
                      <span className="text-[12px] text-light">{t("ticket.counter", { c: tk.counter ?? "1" })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{t("biz.inLine")} · <span className="ltr-nums">{line.length}</span></p>
              {line.length === 0 ? <p className="rounded-2xl bg-bg p-4 text-[13px] text-muted">{t("biz.emptyLine")}</p> : (
                <ul className="divide-y divide-line rounded-2xl border border-line">
                  {line.slice(0, 5).map((tk, i) => (
                    <li key={tk.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                      <span className="ltr-nums w-5 text-muted">{i + 1}</span>
                      <span className="ltr-nums font-semibold text-navy">{tk.number}</span>
                      <span className="flex-1 truncate text-muted">{label(tk)}</span>
                      <StatusBadge status={tk.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[16px] font-semibold text-navy"><Gauge className="h-5 w-5 text-medium" />{t("biz.alerts")}</h2>
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 rounded-2xl bg-success/10 p-4 text-[13px] text-success"><CheckCircle2 className="h-4 w-4" />{t("biz.noAlerts")}</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className={cn("flex items-start gap-2.5 rounded-2xl p-3.5 text-[13px]", a.severity === "critical" ? "bg-error/10 text-error" : "bg-warning/15 text-[#8a5b12]")}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t(`biz.alert.${a.kind}`, a.vars)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-navy">{t("biz.reviewsRecent")}</h2>
          <Link href="/business/analytics" className="text-[13px] text-medium">{t("biz.analytics")}</Link>
        </div>
        {reviews.length === 0 ? <p className="text-[13px] text-muted">{t("place.noReviews")}</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-navy">{maskName(r.authorName)}</span><Stars value={r.rating} size={12} /></div>
                {r.text && <p className="mt-1.5 text-[13px] text-muted">{r.text}</p>}
                <div className="mt-2 flex gap-2 text-[11px] text-muted"><Badge tone="muted">{t("review.wait")}: {r.waitRating}/5</Badge><span>{formatDate(r.at, locale)} · {l(db.branches.find((b) => b.id === r.branchId)?.name, locale)}</span></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
