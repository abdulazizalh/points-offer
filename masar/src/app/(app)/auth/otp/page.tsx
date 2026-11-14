"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/store";
import { clearPending, readPending, requestOtp, verifyOtp, type PendingAuth } from "@/lib/auth";
import { DATA_MODE, DEMO_OTP } from "@/lib/config";
import { cn, normalizeKuwaitPhone } from "@/lib/utils";

export default function OtpPage() {
  const { t, setSession, errorText } = useStore();
  const router = useRouter();
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(30);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const p = readPending();
    if (!p) router.replace("/auth/login");
    else setPending(p);
    setTimeout(() => refs.current[0]?.focus(), 100);
  }, [router]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const submit = async (code: string) => {
    if (!pending || code.length !== 6) return;
    setLoading(true);
    const r = await verifyOtp(pending, code);
    setLoading(false);
    if (!r.ok) {
      setError(r.error === "bad_code" ? t("auth.invalidOtp") : r.error === "not_found" ? t("auth.noUser") : errorText(r.error));
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
      return;
    }
    clearPending();
    setSession({ userId: r.data, onboarded: true, ...(pending.locale ? { locale: pending.locale } : {}) });
    router.replace(pending.next || "/home");
  };

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const arr = clean.slice(0, 6).split("");
      const next = Array(6).fill("").map((_, k) => arr[k] ?? "");
      setDigits(next);
      refs.current[Math.min(5, arr.length)]?.focus();
      if (arr.length === 6) submit(arr.join(""));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError("");
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
  };

  if (!pending) return null;
  return (
    <AuthShell title={t("auth.otpTitle")} sub={<>{t("auth.otpSub", { phone: "§" }).split("§")[0]}<span dir="ltr" className="font-semibold text-navy">{normalizeKuwaitPhone(pending.phone)}</span>{t("auth.otpSub", { phone: "§" }).split("§")[1]}</>}>
      {DATA_MODE === "demo" && (
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-[#fdf6ea] p-3.5 text-[13px] text-[#8a5b12]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> <span>{t("auth.otpDemo", { code: DEMO_OTP })}</span>
        </div>
      )}
      <div className="flex justify-between gap-2" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            maxLength={6}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
            className={cn("h-14 w-full rounded-2xl border bg-white text-center text-[22px] font-semibold text-navy outline-none transition focus:border-accent focus:ring-4 focus:ring-pale/60", error ? "border-error" : "border-line")}
          />
        ))}
      </div>
      {error && <p className="mt-3 text-[13px] text-error" role="alert">{error}</p>}
      <div className="mt-8">
        <Button size="lg" full loading={loading} disabled={digits.some((x) => !x)} onClick={() => submit(digits.join(""))}>{t("auth.verify")}</Button>
      </div>
      <div className="mt-5 text-center text-[13px]">
        {wait > 0 ? (
          <span className="text-muted">{t("auth.resendIn", { s: wait })}</span>
        ) : (
          <button className="font-semibold text-medium" onClick={async () => { await requestOtp(pending.phone); setWait(30); }}>{t("auth.resend")}</button>
        )}
      </div>
    </AuthShell>
  );
}
