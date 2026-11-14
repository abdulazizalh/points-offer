"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Field, Input, PageHeader, Segmented } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { useStore, store } from "@/lib/store";
import type { Locale } from "@/lib/types";

export default function EditProfile() {
  return <RequireUser><EditInner /></RequireUser>;
}

function EditInner() {
  const { t, user, setSession, toast } = useStore();
  const router = useRouter();
  const [name, setName] = useState(user!.name);
  const [email, setEmail] = useState(user!.email ?? "");
  const [lang, setLang] = useState<Locale>(user!.locale);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = () => {
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = t("auth.invalidName");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) er.email = t("auth.invalidEmail");
    setErrors(er);
    if (Object.keys(er).length) return;
    store.mutate((d) => {
      const u = d.users.find((x) => x.id === user!.id);
      if (u) Object.assign(u, { name: name.trim(), email: email.trim() || undefined, locale: lang });
      return { ok: true, data: undefined };
    });
    setSession({ locale: lang });
    toast(t("common.saved"));
    router.back();
  };
  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("profile.edit")} />
      <div className="space-y-4 px-5">
        <div className="flex justify-center py-2"><Avatar name={name || "?"} hue={user!.avatarHue} size={84} /></div>
        <Field label={t("auth.fullName")} error={errors.name} htmlFor="n"><Input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} invalid={!!errors.name} /></Field>
        <Field label={t("common.phone")} hint="OTP-verified" htmlFor="p"><Input id="p" value={user!.phone} disabled dir="ltr" /></Field>
        <Field label={`${t("common.email")} (${t("common.optional")})`} error={errors.email} htmlFor="e"><Input id="e" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} /></Field>
        <Field label={t("auth.prefLang")}><Segmented className="w-full" value={lang} onChange={setLang} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} /></Field>
        <div className="pt-2"><Button size="lg" full onClick={save}>{t("common.save")}</Button></div>
      </div>
    </div>
  );
}
