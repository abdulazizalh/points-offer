"use client";
import Link from "next/link";
import React from "react";
import { Languages } from "lucide-react";
import { BackButton } from "./ui";
import { Logo } from "./Logo";
import { useStore } from "@/lib/store";

export function AuthShell({ title, sub, children, back = true, footer }: { title: string; sub?: React.ReactNode; children: React.ReactNode; back?: boolean; footer?: React.ReactNode }) {
  const { locale, setSession } = useStore();
  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 pb-8 pt-3 sm:min-h-[calc(100dvh-3rem)]">
      <div className="flex h-12 items-center justify-between">
        {back ? <BackButton /> : <Logo size={30} />}
        <button onClick={() => setSession({ locale: locale === "ar" ? "en" : "ar" })} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-navy" aria-label="Change language">
          <Languages className="h-3.5 w-3.5" /> {locale === "ar" ? "English" : "العربية"}
        </button>
      </div>
      <div className="mt-8 animate-slide-up">
        <h1 className="text-[26px] font-semibold text-navy">{title}</h1>
        {sub && <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      <div className="mt-8 flex-1 animate-fade-in">{children}</div>
      {footer && <div className="pt-6 text-center text-[14px] text-muted">{footer}</div>}
    </div>
  );
}

export function PhoneInput({ value, onChange, invalid, id }: { value: string; onChange: (v: string) => void; invalid?: boolean; id?: string }) {
  const { t } = useStore();
  return (
    <div dir="ltr" className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:ring-4 focus-within:ring-pale/60 ${invalid ? "border-error" : "border-line focus-within:border-accent"}`}>
      <span className="flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap border-e border-line bg-bg px-3 text-[14px] font-medium text-navy">🇰🇼 +965</span>
      <input
        id={id}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={t("auth.phonePlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, "").slice(0, 9))}
        className="h-full flex-1 bg-transparent px-3 text-[16px] tracking-wider text-navy outline-none placeholder:text-muted/60"
      />
    </div>
  );
}

export function LegalLine() {
  const { t } = useStore();
  const [a, rest] = t("auth.agree").split("{terms}");
  const [b, c] = (rest ?? "").split("{privacy}");
  return (
    <p className="text-center text-[12px] leading-relaxed text-muted">
      {a}
      <Link href="/legal/terms" className="font-medium text-medium underline-offset-2 hover:underline">{t("auth.terms")}</Link>
      {b}
      <Link href="/legal/privacy" className="font-medium text-medium underline-offset-2 hover:underline">{t("auth.privacy")}</Link>
      {c}
    </p>
  );
}
