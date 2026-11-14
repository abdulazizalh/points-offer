"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Building2 } from "lucide-react";
import { AuthShell, LegalLine, PhoneInput } from "@/components/AuthShell";
import { Button, Field, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import { findCustomerByPhone, passwordLogin, requestOtp, savePending } from "@/lib/auth";
import { isValidKuwaitPhone } from "@/lib/utils";

function LoginInner() {
  const { t, db, setSession, errorText } = useStore();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/home";
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidKuwaitPhone(phone)) return setError(t("auth.invalidPhone"));
    if (!findCustomerByPhone(db, phone)) return setError(t("auth.noUser"));
    setLoading(true);
    const r = await requestOtp(phone);
    setLoading(false);
    if (!r.ok) return setError(errorText(r.error));
    savePending({ mode: "login", phone, next, sentAt: Date.now() });
    router.push("/auth/otp");
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("auth.invalidEmail"));
    setLoading(true);
    const r = await passwordLogin(email, password);
    setLoading(false);
    if (!r.ok) return setError(r.error === "account_suspended" ? errorText(r.error) : t("auth.noUser"));
    setSession({ userId: r.data });
    router.replace(next);
  };

  return (
    <AuthShell
      back={false}
      title={t("auth.welcome")}
      sub={t("auth.welcomeSub")}
      footer={
        <div className="space-y-4">
          <p>
            {t("auth.noAccount")}{" "}
            <Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-navy hover:underline">
              {t("auth.signup")}
            </Link>
          </p>
          <Link href="/business" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-medium hover:text-deep">
            <Building2 className="h-4 w-4" /> {t("auth.businessLink")}
          </Link>
        </div>
      }
    >
      {mode === "phone" ? (
        <form onSubmit={submitPhone} className="space-y-5" noValidate>
          <Field label={t("common.phone")} error={error} htmlFor="phone">
            <PhoneInput id="phone" value={phone} onChange={(v) => { setPhone(v); setError(""); }} invalid={!!error} />
          </Field>
          <Button type="submit" size="lg" full loading={loading}>{t("auth.sendCode")}</Button>
          <button type="button" onClick={() => { setMode("email"); setError(""); }} className="w-full text-center text-[13px] font-medium text-medium hover:text-deep">
            {t("auth.usePassword")}
          </button>
        </form>
      ) : (
        <form onSubmit={submitEmail} className="space-y-4" noValidate>
          <Field label={t("common.email")} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          </Field>
          <Field label={t("auth.password")} error={error} htmlFor="pw">
            <Input id="pw" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} invalid={!!error} />
          </Field>
          <div className="text-end">
            <Link href="/auth/forgot" className="text-[13px] font-medium text-medium hover:text-deep">{t("auth.forgot")}</Link>
          </div>
          <Button type="submit" size="lg" full loading={loading}>{t("auth.login")}</Button>
          <button type="button" onClick={() => { setMode("phone"); setError(""); }} className="w-full text-center text-[13px] font-medium text-medium hover:text-deep">
            {t("auth.usePhone")}
          </button>
        </form>
      )}
      <div className="my-6 flex items-center gap-3 text-[12px] text-muted">
        <span className="h-px flex-1 bg-line" /> {t("common.or")} <span className="h-px flex-1 bg-line" />
      </div>
      <Button variant="outline" size="lg" full href="/home">{t("auth.guest")}</Button>
      <div className="mt-6"><LegalLine /></div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
