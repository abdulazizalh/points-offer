"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, PageHeader, Toggle } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { useStore, store } from "@/lib/store";

export default function PrivacySettings() {
  return <RequireUser><PrivInner /></RequireUser>;
}

function PrivInner() {
  const { t, user, db, session, setSession, toast } = useStore();
  const router = useRouter();
  const [del, setDel] = useState(false);
  if (!user) return null;
  const exportData = () => {
    const data = {
      profile: { name: user.name, phone: user.phone, email: user.email, locale: user.locale, createdAt: new Date(user.createdAt).toISOString() },
      tickets: db.tickets.filter((x) => x.userId === user.id),
      events: db.events.filter((e) => db.tickets.some((x) => x.id === e.ticketId && x.userId === user.id)),
      reviews: db.reviews.filter((r) => r.userId === user.id),
      favorites: db.favorites.filter((f) => f.userId === user.id),
      notifications: db.notifications.filter((n) => n.userId === user.id),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "masar-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const deleteAccount = () => {
    store.mutate((d) => {
      d.tickets = d.tickets.filter((x) => x.userId !== user.id);
      d.reviews = d.reviews.filter((r) => r.userId !== user.id);
      d.favorites = d.favorites.filter((f) => f.userId !== user.id);
      d.notifications = d.notifications.filter((n) => n.userId !== user.id);
      d.users = d.users.filter((u) => u.id !== user.id);
      return { ok: true, data: undefined };
    });
    setSession({ userId: undefined });
    toast(t("common.done"));
    router.replace("/auth/login");
  };
  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("privacy.title")} />
      <div className="space-y-4 px-5">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex-1"><p className="text-[14.5px] font-medium text-navy">{t("privacy.showName")}</p><p className="text-[12px] text-muted">{t("privacy.showNameSub")}</p></div>
          <Toggle checked={session.showFirstName} onChange={(v) => setSession({ showFirstName: v })} label={t("privacy.showName")} />
        </Card>
        <Card className="p-4">
          <p className="text-[14.5px] font-medium text-navy">{t("privacy.data")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("privacy.dataSub")}</p>
          <div className="mt-4 grid gap-2">
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportData}>{t("privacy.export")}</Button>
            <Button variant="outline" className="!text-error" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(true)}>{t("privacy.delete")}</Button>
          </div>
        </Card>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} danger title={t("privacy.delete")} body={t("privacy.deleteConfirm")} confirmLabel={t("common.delete")} icon={<Trash2 className="h-7 w-7" />} onConfirm={deleteAccount} />
    </div>
  );
}
