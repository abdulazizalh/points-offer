"use client";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import { requestPasswordReset } from "@/lib/auth";
import { DATA_MODE } from "@/lib/config";

export default function ForgotPage() {
  const { t } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t("auth.invalidEmail"));
    setLoading(true);
    await requestPasswordReset(email);
    try { sessionStorage.setItem("masar.resetEmail", email); } catch {}
    setLoading(false);
    setSent(true);
  };
  return (
    <AuthShell title={t("auth.forgotTitle")} sub={t("auth.forgotSub")}>
      {sent ? (
        <div className="animate-slide-up rounded-[20px] bg-bg p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success"><MailCheck className="h-7 w-7" /></div>
          <p className="text-[14.5px] leading-relaxed text-navy">{t("auth.linkSent", { email })}</p>
          {DATA_MODE === "demo" && (
            <>
              <p className="mt-3 text-[12.5px] text-[#8a5b12]">{t("auth.linkDemo")}</p>
              <Button className="mt-5" full href="/auth/reset">{t("common.continue")}</Button>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Field label={t("common.email")} error={error} htmlFor="email">
            <Input id="email" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} invalid={!!error} />
          </Field>
          <Button type="submit" size="lg" full loading={loading}>{t("auth.sendLink")}</Button>
        </form>
      )}
    </AuthShell>
  );
}
