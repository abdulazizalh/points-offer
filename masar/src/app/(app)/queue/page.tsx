"use client";
import Link from "next/link";
import { History, Ticket as TicketIcon } from "lucide-react";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { TicketCard } from "@/components/TicketCard";
import { useStore } from "@/lib/store";
import { activeTickets } from "@/lib/selectors";

export default function MyQueue() {
  const { t, db, session } = useStore();
  const tickets = activeTickets(db, session.userId);
  return (
    <RequireUser>
      <div className="animate-fade-in">
        <PageHeader back={false} title={t("myq.title")} right={<Link href="/history" className="flex items-center gap-1 text-[13px] font-medium text-medium"><History className="h-4 w-4" />{t("myq.history")}</Link>} />
        {tickets.length === 0 ? (
          <EmptyState icon={<TicketIcon className="h-9 w-9" />} title={t("myq.empty")} sub={t("myq.emptySub")} action={<Button href="/explore">{t("myq.find")}</Button>} />
        ) : (
          <div className="space-y-4 px-5 pb-6">
            {tickets.map((tk) => <TicketCard key={tk.id} ticket={tk} compact />)}
          </div>
        )}
      </div>
    </RequireUser>
  );
}
