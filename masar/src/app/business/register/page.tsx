"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { PhoneInput } from "@/components/AuthShell";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { registerBusiness } from "@/lib/engine";
import { isValidKuwaitPhone, l, normalizeKuwaitPhone } from "@/lib/utils";

export default function Register() {
  const { t, db, locale, run, setSession } = useStore();
  const router = useRouter();
  const [f, setF] = useState({ ownerName: "", phone: "", email: "", businessNameEn: "", businessNameAr: "", categoryId: db.categories[0].id, crNumber: "", areaId: db.areas[0].id, address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.ownerName.trim().length < 2) er.ownerName = t("auth.invalidName");
    if (!isValidKuwaitPhone(f.phone)) er.phone = t("auth.invalidPhone");
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = t("auth.invalidEmail");
    if (f.businessNameEn.trim().length < 2) er.businessNameEn = t("common.required");
    if (f.crNumber.trim().length < 4) er.crNumber = t("common.required");
    setErrors(er);
    if (Object.keys(er).length) return;
    const r = run((d) => registerBusiness(d, { ...f, phone: normalizeKuwaitPhone(f.phone) }));
    if (r.ok) setDone(r.data.user.id);
  };
  return (
    <div className="min-h-dvh bg-bg px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/business"><Logo size={30} /></Link>
        <Card className="mt-6 p-6 sm:p-8">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-9 w-9" /></div>
              <h1 className="mt-4 text-[22px] font-semibold text-navy">{t("biz.ver.pending")}</h1>
              <p className="mt-2 text-[14px] text-muted">{t("biz.pendingNote")}</p>
              <Button className="mt-6" size="lg" onClick={() => { setSession({ bizUserId: done, bizBranchId: undefined }); router.push("/business"); }}>{t("biz.dashboard")}</Button>
            </div>
          ) : (
            <>
              <h1 className="text-[24px] font-semibold text-navy">{t("biz.register")}</h1>
              <p className="mt-1 text-[14px] text-muted">{t("biz.registerSub")}</p>
              <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
                <Field label={t("biz.ownerName")} error={errors.ownerName} htmlFor="on"><Input id="on" value={f.ownerName} onChange={set("ownerName")} invalid={!!errors.ownerName} /></Field>
                <Field label={t("common.phone")} error={errors.phone} htmlFor="ph"><PhoneInput id="ph" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} invalid={!!errors.phone} /></Field>
                <Field label={t("biz.nameEn")} error={errors.businessNameEn} htmlFor="ne"><Input id="ne" dir="ltr" value={f.businessNameEn} onChange={set("businessNameEn")} invalid={!!errors.businessNameEn} /></Field>
                <Field label={t("biz.nameAr")} htmlFor="na"><Input id="na" dir="rtl" value={f.businessNameAr} onChange={set("businessNameAr")} /></Field>
                <Field label={t("biz.category")} htmlFor="ct"><Select id="ct" value={f.categoryId} onChange={set("categoryId")}>{db.categories.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{l(c.name, locale)}</option>)}</Select></Field>
                <Field label={t("biz.cr")} error={errors.crNumber} htmlFor="cr"><Input id="cr" dir="ltr" value={f.crNumber} onChange={set("crNumber")} invalid={!!errors.crNumber} /></Field>
                <Field label={t("biz.area")} htmlFor="ar"><Select id="ar" value={f.areaId} onChange={set("areaId")}>{db.areas.map((a) => <option key={a.id} value={a.id}>{l(a.name, locale)}</option>)}</Select></Field>
                <Field label={`${t("common.email")} (${t("common.optional")})`} error={errors.email} htmlFor="em"><Input id="em" type="email" dir="ltr" value={f.email} onChange={set("email")} invalid={!!errors.email} /></Field>
                <div className="sm:col-span-2"><Field label={t("biz.address")} htmlFor="ad"><Input id="ad" value={f.address} onChange={set("address")} /></Field></div>
                <div className="sm:col-span-2"><Button type="submit" size="lg" full>{t("biz.submitReg")}</Button></div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
