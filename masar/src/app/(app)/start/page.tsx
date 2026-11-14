"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { useStore } from "@/lib/store";

export default function Splash() {
  const router = useRouter();
  const { session, user } = useStore();
  useEffect(() => {
    const id = setTimeout(() => {
      if (!session.onboarded) router.replace("/onboarding");
      else if (!user) router.replace("/auth/login");
      else router.replace("/home");
    }, 2100);
    return () => clearTimeout(id);
  }, [router, session.onboarded, user]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-navy via-[#294770] to-deep text-white sm:min-h-[calc(100dvh-3rem)]">
      <div className="absolute -top-32 start-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl rtl:translate-x-1/2" />
      <div className="absolute -bottom-24 -end-20 h-72 w-72 rounded-full bg-light/10 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <div className="grid h-32 w-32 animate-pop place-items-center rounded-[36px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <LogoMark size={104} animated />
        </div>
        <h1 className="mt-8 animate-slide-up text-[30px] font-semibold tracking-[0.34em] [animation-delay:.5s]" dir="ltr" style={{ fontFamily: "var(--font-inter)" }}>
          MASAR
        </h1>
        <p className="mt-1 animate-slide-up text-[22px] font-medium text-pale [animation-delay:.65s]" style={{ fontFamily: "var(--font-plex-ar)" }}>
          مَسار
        </p>
        <p className="mt-6 animate-fade-in text-[14px] tracking-wide text-light [animation-delay:1s]" dir="ltr">
          Your Time. Your Turn.
        </p>
      </div>
      <div className="absolute bottom-12 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}
