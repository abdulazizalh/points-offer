"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, LegalLine, PhoneInput } from "@/components/AuthShell";
import { Button, Field, Input, Segmented } from "@/components/ui";
import { useStore } from "@/lib/store";
import { findCustomerByPhone, requestOtp, savePending } from "@/lib/auth";
import { isValidKuwaitPhone } from "@/lib/utils";
import type { Locale } from "@/lib/types";

function SignupInner() {
  const { t, db, locale, setSession, errorText } = useStore();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/home";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState<Locale>(locale);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = t("auth.invalidName");
    if (!isValidKuwaitPhone(phone)) er.phone = t("auth.invalidPhone");
    else if (findCustomerByPhone(db, phone)) er.phone = t("auth.exists");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) er.email = t("auth.invalidEmail");
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    const r = await requestOtp(phone);
    setLoading(false);
    if (!r.ok) return setErrors({ phone: errorText(r.error) });
    setSession({ locale: lang });
    savePending({ mode: "signup", phone, name, email, locale: lang, next, sentAt: Date.now() });
    router.push("/auth/otp");
  };

  return (
    <AuthShell
      title={t("auth.signup")}
      sub={t("auth.signupSub")}
      footer={<p>{t("auth.haveAccount")} <Link href="/auth/login" className="font-semibold text-navy hover:underline">{t("auth.login")}</Link></p>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("auth.fullName")} error={errors.name} htmlFor="name">
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} maxLength={80} />
        </Field>
        <Field label={t("common.phone")} error={errors.phone} htmlFor="phone">
          <PhoneInput id="phone" value={phone} onChange={setPhone} invalid={!!errors.phone} />
        </Field>
        <Field label={`${t("common.email")} (${t("common.optional")})`} error={errors.email} htmlFor="email">
          <Input id="email" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} />
        </Field>
        <Field label={t("auth.prefLang")}>
          <Segmented className="w-full" value={lang} onChange={(v) => { setLang(v); setSession({ locale: v }); }} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
        </Field>
        <div className="pt-2">
          <Button type="submit" size="lg" full loading={loading}>{t("auth.sendCode")}</Button>
        </div>
        <LegalLine />
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return <Suspense><SignupInner /></Suspense>;
}
