"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import { setPasswordForEmail } from "@/lib/auth";

export default function ResetPage() {
  const { t, toast } = useStore();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (pw.length < 8) er.pw = t("auth.weakPassword");
    if (pw !== pw2) er.pw2 = t("auth.mismatch");
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    let email = "";
    try { email = sessionStorage.getItem("masar.resetEmail") ?? ""; } catch {}
    await setPasswordForEmail(email, pw);
    setLoading(false);
    toast(t("auth.resetDone"));
    router.replace("/auth/login");
  };
  return (
    <AuthShell title={t("auth.resetTitle")}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("auth.newPassword")} error={errors.pw} htmlFor="pw" hint={t("auth.weakPassword")}>
          <Input id="pw" type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} invalid={!!errors.pw} />
        </Field>
        <Field label={t("auth.confirmPassword")} error={errors.pw2} htmlFor="pw2">
          <Input id="pw2" type="password" dir="ltr" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} invalid={!!errors.pw2} />
        </Field>
        <div className="pt-2"><Button type="submit" size="lg" full loading={loading}>{t("common.save")}</Button></div>
      </form>
    </AuthShell>
  );
}
