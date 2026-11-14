"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Clock, QrCode, UserRound, Users } from "lucide-react";
import { Badge, Card, DemoBadge, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { activeServers, estimateWait, serviceMinutes } from "@/lib/intelligence";
import { branchLine, queueTypeOf } from "@/lib/engine";
import { cn, isBranchOpen, l } from "@/lib/utils";

function ServicesInner() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const onsite = sp.get("onsite") === "1";
  const code = sp.get("code");
  const { t, db, locale } = useStore();
  const branch = db.branches.find((b) => b.id === id);
  if (!branch) return <PageHeader title={t("place.notFound")} />;
  const biz = db.businesses.find((b) => b.id === branch.businessId)!;
  const services = db.services.filter((s) => s.branchIds.includes(branch.id));
  const line = branchLine(db, branch.id);
  const open = isBranchOpen(branch);
  return (
    <div className="animate-fade-in pb-8">
      <PageHeader title={t("service.choose")} sub={`${l(biz.name, locale)} · ${l(branch.name, locale)}`} right={biz.isDemo ? <DemoBadge /> : undefined} />
      {onsite && (
        <div className="mx-5 mb-3 flex items-center gap-2.5 rounded-2xl bg-pale/50 p-3 text-[13px] text-deep">
          <QrCode className="h-4 w-4 shrink-0" /> {t("book.onsiteSub")}
        </div>
      )}
      <div className="space-y-3 px-5">
        {services.map((s) => {
          const qt = queueTypeOf(branch, s);
          const slotted = qt === "timed_entry" || qt === "appointment";
          const inQueue = line.filter((x) => x.serviceId === s.id).length;
          const est = estimateWait(db, branch.id, s.id, line);
          const staff = activeServers(db, branch.id, s.id);
          const remoteOk = onsite || (branch.remoteBooking && s.remoteBooking && qt !== "walk_in");
          const available = s.active && remoteOk && (slotted || open);
          const href = `/book/${branch.id}/${s.id}${onsite ? `?onsite=1${code ? `&code=${encodeURIComponent(code)}` : ""}` : ""}`;
          const body = (
            <Card className={cn("p-4 transition", available ? "hover:-translate-y-0.5 hover:shadow-float" : "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-navy">{l(s.name, locale)}</h3>
                  {s.description[locale] && <p className="mt-1 text-[13px] leading-relaxed text-muted">{l(s.description, locale)}</p>}
                </div>
                {available ? <ChevronRight className="rtl-flip mt-1 h-5 w-5 shrink-0 text-muted" /> : <Badge tone="muted">{!s.active || !open ? t("service.unavailable") : t("service.remoteOff")}</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-navy"><Clock className="h-3.5 w-3.5 text-medium" />{t("service.duration", { n: Math.round(serviceMinutes(db, s, branch.id)) })}</span>
                <Badge tone="blue">{t(`qt.${qt}`)}</Badge>
                {!slotted && open && (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-navy"><Users className="h-3.5 w-3.5 text-medium" />{t("service.inQueue", { n: inQueue })}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 font-semibold text-white"><span className="ltr-nums">{est.low}–{est.high}</span> {t("common.min")}</span>
                  </>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-muted"><UserRound className="h-3.5 w-3.5" />{t("service.staff", { n: staff })}</span>
              </div>
            </Card>
          );
          return available ? <Link key={s.id} href={href} className="block">{body}</Link> : <div key={s.id} aria-disabled>{body}</div>;
        })}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return <Suspense><ServicesInner /></Suspense>;
}
