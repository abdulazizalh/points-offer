"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Building2, ChevronRight, FileText, Heart, HelpCircle, History, Languages, LogOut, MapPin, RefreshCcw, Shield, ShieldCheck, UserRound, Wand2 } from "lucide-react";
import { Avatar, Button, Card, ConfirmDialog, PageHeader, Segmented, Toggle } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { DATA_MODE } from "@/lib/config";

export default function Profile() {
  const { t, user, locale, setSession, session, resetDemo, toast } = useStore();
  const router = useRouter();
  const [logout, setLogout] = useState(false);
  const [reset, setReset] = useState(false);

  const Item = ({ href, icon: Icon, label, right }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; right?: React.ReactNode }) => (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-bg">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-pale/50 text-deep"><Icon className="h-[18px] w-[18px]" /></span>
      <span className="flex-1 text-[14.5px] text-navy">{label}</span>
      {right}
      <ChevronRight className="rtl-flip h-4 w-4 text-muted" />
    </Link>
  );

  return (
    <div className="animate-fade-in pb-8">
      <PageHeader back={false} title={t("profile.title")} />
      <div className="space-y-5 px-5">
        {user ? (
          <Card className="flex items-center gap-4 p-4">
            <Avatar name={user.name} hue={user.avatarHue} size={60} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold text-navy">{user.name}</p>
              <p className="ltr-nums text-[13px] text-muted" dir="ltr">{user.phone}</p>
              <p className="text-[11.5px] text-muted">{t("profile.member", { d: formatDate(user.createdAt, locale) })}</p>
            </div>
            <Button size="sm" variant="secondary" href="/profile/edit">{t("common.edit")}</Button>
          </Card>
        ) : (
          <Card className="p-5 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[22px] bg-bg"><LogoMark size={48} /></div>
            <p className="text-[16px] font-semibold text-navy">{t("profile.guestTitle")}</p>
            <p className="mt-1 text-[13px] text-muted">{t("profile.guestSub")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button href="/auth/login">{t("auth.login")}</Button>
              <Button variant="outline" href="/auth/signup">{t("auth.signup")}</Button>
            </div>
          </Card>
        )}

        {user && (
          <Card className="divide-y divide-line overflow-hidden">
            <Item href="/profile/edit" icon={UserRound} label={t("profile.personal")} />
            <Item href="/notifications/settings" icon={Bell} label={t("profile.notifications")} />
            <Item href="/profile/locations" icon={MapPin} label={t("profile.locations")} />
            <Item href="/favorites" icon={Heart} label={t("profile.favorites")} />
            <Item href="/history" icon={History} label={t("profile.history")} />
            <Item href="/profile/privacy" icon={Shield} label={t("profile.privacy")} />
          </Card>
        )}

        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-pale/50 text-deep"><Languages className="h-[18px] w-[18px]" /></span>
          <span className="flex-1 text-[14.5px] text-navy">{t("common.language")}</span>
          <Segmented value={locale} onChange={(v) => setSession({ locale: v })} options={[{ value: "ar", label: "عربي" }, { value: "en", label: "EN" }]} />
        </Card>

        <Card className="divide-y divide-line overflow-hidden">
          <Item href="/help" icon={HelpCircle} label={t("profile.help")} />
          <Item href="/legal/terms" icon={FileText} label={t("profile.terms")} />
          <Item href="/legal/privacy" icon={ShieldCheck} label={t("profile.privacyPolicy")} />
        </Card>

        <Card className="divide-y divide-line overflow-hidden">
          <Item href="/business" icon={Building2} label={t("profile.business")} />
          <Item href="/admin" icon={Shield} label={t("profile.admin")} />
        </Card>

        {DATA_MODE === "demo" && (
          <section>
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-[#9a6514]">{t("profile.demoTools")}</h2>
            <Card className="divide-y divide-line border-warning/30">
              <div className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning/15 text-[#9a6514]"><Wand2 className="h-[18px] w-[18px]" /></span>
                <div className="flex-1">
                  <p className="text-[14.5px] text-navy">{t("profile.simulator")}</p>
                  <p className="text-[12px] leading-relaxed text-muted">{t("profile.simulatorSub")}</p>
                </div>
                <Toggle checked={session.simulator} onChange={(v) => setSession({ simulator: v })} label={t("profile.simulator")} />
              </div>
              <button onClick={() => setReset(true)} className="flex w-full items-center gap-3 p-4 text-start">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning/15 text-[#9a6514]"><RefreshCcw className="h-[18px] w-[18px]" /></span>
                <span className="text-[14.5px] text-navy">{t("profile.resetDemo")}</span>
              </button>
            </Card>
          </section>
        )}

        {user && (
          <Button variant="outline" size="lg" full className="!text-error" icon={<LogOut className="h-5 w-5" />} onClick={() => setLogout(true)}>{t("profile.logout")}</Button>
        )}
        <p className="text-center text-[11px] text-muted" dir="ltr">MASAR · مَسار · v0.1 MVP</p>
      </div>
      <ConfirmDialog open={logout} onClose={() => setLogout(false)} title={t("profile.logoutConfirm")} body="" confirmLabel={t("profile.logout")} danger icon={<LogOut className="h-7 w-7" />} onConfirm={() => { setSession({ userId: undefined }); setLogout(false); router.replace("/auth/login"); }} />
      <ConfirmDialog open={reset} onClose={() => setReset(false)} title={t("profile.resetDemo")} body={t("profile.resetConfirm")} confirmLabel={t("common.confirm")} danger icon={<RefreshCcw className="h-7 w-7" />} onConfirm={() => { resetDemo(); setReset(false); toast(t("common.done")); router.replace("/onboarding"); }} />
    </div>
  );
}
