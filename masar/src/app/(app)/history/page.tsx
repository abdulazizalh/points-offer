"use client";
import Link from "next/link";
import { useState } from "react";
import { History as HistoryIcon, RotateCcw, Star } from "lucide-react";
import { BizLogo, Button, Card, EmptyState, PageHeader, Segmented } from "@/components/ui";
import { StatusBadge } from "@/components/domain";
import { RequireUser } from "@/components/AppFrame";
import { useStore } from "@/lib/store";
import { ACTIVE_STATUSES } from "@/lib/types";
import { formatDateTime, l } from "@/lib/utils";

export default function HistoryPage() {
  const { t, db, session, locale } = useStore();
  const [tab, setTab] = useState<"active" | "completed" | "cancelled">("active");
  const mine = db.tickets.filter((x) => x.userId === session.userId).sort((a, b) => b.createdAt - a.createdAt);
  const list = mine.filter((x) =>
    tab === "active" ? ACTIVE_STATUSES.includes(x.status) : tab === "completed" ? x.status === "COMPLETED" : ["CANCELLED", "NO_SHOW", "SKIPPED"].includes(x.status),
  );
  return (
    <RequireUser>
      <div className="animate-fade-in pb-8">
        <PageHeader title={t("history.title")} />
        <div className="px-5 pb-4">
          <Segmented className="w-full" value={tab} onChange={setTab} options={[{ value: "active", label: t("history.active") }, { value: "completed", label: t("history.completed") }, { value: "cancelled", label: t("history.cancelled") }]} />
        </div>
        {list.length === 0 ? (
          <EmptyState icon={<HistoryIcon className="h-9 w-9" />} title={t("history.empty")} sub={t("history.emptySub")} action={<Button href="/explore">{t("myq.find")}</Button>} />
        ) : (
          <div className="space-y-3 px-5">
            {list.map((tk) => {
              const b = db.businesses.find((x) => x.id === tk.businessId)!;
              const s = db.services.find((x) => x.id === tk.serviceId);
              const waited = tk.startedAt ? Math.max(0, Math.round((tk.startedAt - tk.createdAt) / 60000)) : null;
              return (
                <Card key={tk.id} className="p-4">
                  <Link href={`/queue/${tk.id}`} className="flex items-start gap-3">
                    <BizLogo initials={b.initials} hue={b.hue} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[14.5px] font-semibold text-navy">{l(b.name, locale)}</p>
                        <StatusBadge status={tk.status} />
                      </div>
                      <p className="text-[12.5px] text-muted"><span className="ltr-nums font-semibold text-deep">{tk.number}</span> · {l(s?.name, locale)}</p>
                      <p className="mt-1 text-[12px] text-muted">{formatDateTime(tk.createdAt, locale)}{waited !== null && ` · ${t("history.waited", { n: waited })}`}</p>
                    </div>
                  </Link>
                  {!ACTIVE_STATUSES.includes(tk.status) && (
                    <div className="mt-3 flex gap-2 border-t border-line pt-3">
                      <Button size="sm" variant="secondary" href={`/place/${tk.branchId}/services`} icon={<RotateCcw className="h-4 w-4" />}>{t("ticket.bookAgain")}</Button>
                      {tk.status === "COMPLETED" && !tk.reviewed && <Button size="sm" variant="outline" href={`/review/${tk.id}`} icon={<Star className="h-4 w-4" />}>{t("ticket.rate")}</Button>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RequireUser>
  );
}
