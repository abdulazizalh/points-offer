"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, Clock3, Languages, MapPinned } from "lucide-react";
import { Button } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SLIDES = [
  { icon: Clock3, key: "onb.1" },
  { icon: MapPinned, key: "onb.2" },
  { icon: BellRing, key: "onb.3" },
];

function Illustration({ step }: { step: number }) {
  const Icon = SLIDES[step].icon;
  return (
    <div className="relative mx-auto grid h-64 w-64 place-items-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pale to-white" />
      <div className="absolute inset-6 rounded-full border border-dashed border-light/70" />
      <div className="absolute inset-14 rounded-full bg-white shadow-card" />
      <div key={step} className="relative grid h-24 w-24 animate-pop place-items-center rounded-[30px] bg-gradient-to-br from-navy to-medium text-white shadow-float">
        <Icon className="h-11 w-11" strokeWidth={1.6} />
      </div>
      {step === 1 && (
        <div className="absolute end-2 top-10 animate-slide-up rounded-2xl bg-white px-3 py-2 text-start shadow-card">
          <p className="text-[10px] text-muted">A-024</p>
          <p className="text-[13px] font-semibold text-navy ltr-nums">5 ahead · 18–24m</p>
        </div>
      )}
      {step === 2 && (
        <div className="absolute start-0 top-12 animate-slide-up rounded-2xl bg-white px-3 py-2 shadow-card">
          <p className="text-[12px] font-semibold text-navy">🔔 3 ahead of you</p>
        </div>
      )}
      {step === 0 && (
        <div className="absolute bottom-8 end-4 animate-slide-up rounded-2xl bg-white p-2 shadow-card">
          <LogoMark size={34} />
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { t, setSession, locale } = useStore();
  const finish = () => {
    setSession({ onboarded: true });
    router.replace("/auth/login");
  };
  const last = step === SLIDES.length - 1;
  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 pb-8 pt-4 sm:min-h-[calc(100dvh-3rem)]">
      <div className="flex items-center justify-between">
        <button onClick={() => setSession({ locale: locale === "ar" ? "en" : "ar" })} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-navy">
          <Languages className="h-3.5 w-3.5" /> {locale === "ar" ? "English" : "العربية"}
        </button>
        {!last && (
          <button onClick={finish} className="px-2 py-1.5 text-[14px] font-medium text-muted hover:text-navy">
            {t("common.skip")}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <Illustration step={step} />
        <div key={step} className="mt-10 animate-slide-up text-center">
          <h1 className="text-[26px] font-semibold leading-tight text-navy">{t(`${SLIDES[step].key}.title`)}</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-relaxed text-muted">{t(`${SLIDES[step].key}.body`)}</p>
        </div>
      </div>
      <div className="mb-8 flex justify-center gap-2" role="tablist" aria-label="Onboarding progress">
        {SLIDES.map((_, i) => (
          <button key={i} aria-label={`${i + 1}`} aria-selected={i === step} role="tab" onClick={() => setStep(i)} className={cn("h-2 rounded-full transition-all", i === step ? "w-7 bg-navy" : "w-2 bg-pale")} />
        ))}
      </div>
      <Button size="lg" full onClick={() => (last ? finish() : setStep(step + 1))}>
        {last ? t("onb.start") : t("common.next")}
      </Button>
    </div>
  );
}
