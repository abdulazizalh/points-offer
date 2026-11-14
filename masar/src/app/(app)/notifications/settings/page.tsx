"use client";
import { useEffect, useState } from "react";
import { Bell, MessageCircle, MessageSquareText, Smartphone } from "lucide-react";
import { Card, PageHeader, Toggle, Badge } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { useStore, store } from "@/lib/store";
import type { NotificationPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NotificationSettings() {
  const { t, user, toast } = useStore();
  const [status, setStatus] = useState<{ sms: boolean; whatsapp: boolean; push: boolean } | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPerm("Notification" in window ? Notification.permission : "unsupported");
    fetch("/api/notify").then((r) => r.json()).then(setStatus).catch(() => setStatus({ sms: false, whatsapp: false, push: false }));
  }, []);

  if (!user) return <RequireUser>{null}</RequireUser>;
  const save = (patch: Partial<NotificationPrefs>) => {
    store.mutate((d) => {
      const u = d.users.find((x) => x.id === user.id);
      if (u) u.prefs = { ...u.prefs, ...patch };
      return { ok: true, data: undefined };
    });
    toast(t("common.saved"));
  };
  const togglePush = async (on: boolean) => {
    if (!on) return save({ push: false });
    if (perm === "unsupported") return toast(t("nset.pushUnsupported"), "error");
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p !== "granted") return toast(t("nset.pushDenied"), "error");
    save({ push: true });
  };
  const rows = [
    { key: "push" as const, icon: Smartphone, title: t("nset.push"), sub: perm === "denied" ? t("nset.pushDenied") : perm === "unsupported" ? t("nset.pushUnsupported") : t("nset.pushSub"), connected: perm !== "unsupported", value: user.prefs.push, onChange: togglePush },
    { key: "sms" as const, icon: MessageSquareText, title: t("nset.sms"), sub: status?.sms ? t("nset.connected") : t("nset.notConnected"), connected: !!status?.sms, value: user.prefs.sms, onChange: (v: boolean) => save({ sms: v }) },
    { key: "whatsapp" as const, icon: MessageCircle, title: t("nset.whatsapp"), sub: status?.whatsapp ? t("nset.connected") : t("nset.notConnected"), connected: !!status?.whatsapp, value: user.prefs.whatsapp, onChange: (v: boolean) => save({ whatsapp: v }) },
  ];
  return (
    <RequireUser>
      <div className="animate-fade-in pb-10">
        <PageHeader title={t("nset.title")} />
        <div className="space-y-5 px-5">
          <section>
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("nset.channels")}</h2>
            <Card className="divide-y divide-line">
              <div className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-pale/60 text-deep"><Bell className="h-5 w-5" /></span>
                <div className="flex-1"><p className="text-[14.5px] font-medium text-navy">{t("nset.inApp")}</p><p className="text-[12px] text-muted">{t("nset.inAppSub")}</p></div>
                <Toggle checked label={t("nset.inApp")} onChange={() => {}} disabled />
              </div>
              {rows.map((r) => (
                <div key={r.key} className="flex items-center gap-3 p-4">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", r.connected ? "bg-pale/60 text-deep" : "bg-[#eef3f8] text-muted")}><r.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[14.5px] font-medium text-navy">{r.title} {!r.connected && r.key !== "push" && <Badge tone="muted">{t("delivery.not_configured")}</Badge>}</p>
                    <p className="text-[12px] leading-relaxed text-muted">{r.sub}</p>
                  </div>
                  <Toggle checked={r.value} label={r.title} onChange={r.onChange} />
                </div>
              ))}
            </Card>
          </section>
          <section>
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("nset.approach")}</h2>
            <Card className="flex gap-2 p-3">
              {[1, 2, 3, 5].map((n) => (
                <button key={n} onClick={() => save({ approachingAt: n })} aria-pressed={user.prefs.approachingAt === n} className={cn("ltr-nums h-11 flex-1 rounded-xl text-[15px] font-semibold transition", user.prefs.approachingAt === n ? "bg-navy text-white" : "bg-bg text-navy")}>
                  {n}
                </button>
              ))}
            </Card>
          </section>
        </div>
      </div>
    </RequireUser>
  );
}
