"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Maximize, Minimize, Volume2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { branchLine, nowServing } from "@/lib/engine";
import { checkinCode, cn, formatTime, kuwaitDate, l } from "@/lib/utils";
import { QrCode } from "@/components/domain";
import { LogoMark } from "@/components/Logo";

/** Public waiting-room display for TVs. Updates live from the shared queue. */
export default function Display() {
  const { branchId } = useParams<{ branchId: string }>();
  const { db, locale, setSession } = useStore();
  const [now, setNow] = useState(Date.now());
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => { clearInterval(id); document.removeEventListener("fullscreenchange", onFs); };
  }, []);
  const branch = db.branches.find((b) => b.id === branchId);
  const latestCall = branch ? nowServing(db, branch.id, now)[0] : undefined;
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!latestCall) return;
    setFlash(latestCall.id);
    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [latestCall?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!branch) return <div className="grid min-h-dvh place-items-center bg-navy text-white">—</div>;
  const biz = db.businesses.find((b) => b.id === branch.businessId)!;
  const serving = nowServing(db, branch.id, now);
  const line = branchLine(db, branch.id, now);
  const session = db.sessions.find((s) => s.branchId === branch.id && s.date === kuwaitDate(now));
  const recent = db.tickets.filter((t) => t.sessionId === session?.id && t.calledAt && ["IN_SERVICE", "COMPLETED", "SKIPPED", "NO_SHOW"].includes(t.status)).sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0)).slice(0, 6);
  const code = checkinCode(branch.checkinSecret, now);
  const bi = (en: string, ar: string) => (
    <span className="flex flex-col leading-tight"><span>{ar}</span><span className="text-[0.55em] font-medium opacity-70" dir="ltr">{en}</span></span>
  );
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#16294a] via-navy to-deep p-6 text-white lg:p-10" dir="rtl">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white"><LogoMark size={46} /></div>
          <div>
            <p className="text-[26px] font-semibold">{biz.name.ar} · {l(branch.name, "ar")}</p>
            <p className="text-[15px] text-light" dir="ltr">{biz.name.en} · {branch.name.en}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="ltr-nums text-[34px] font-light">{formatTime(now, locale)}</p>
          <button onClick={() => (fs ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})} className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="Full screen">
            {fs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
          {locale !== "ar" && <button className="hidden" onClick={() => setSession({ locale: "ar" })} />}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className={cn("rounded-[32px] bg-white p-8 text-navy shadow-float transition", flash && "ring-8 ring-success/60")}>
          <div className="flex items-center justify-between text-[22px] font-semibold text-muted">
            {bi("Now Serving", "الرقم الحالي")}
            {flash && <Volume2 className="h-8 w-8 animate-pulse text-success" />}
          </div>
          {serving.length === 0 ? (
            <p className="py-16 text-center text-[40px] font-semibold text-light">—</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {serving.slice(0, 4).map((tk, i) => (
                <div key={tk.id} className={cn("rounded-3xl p-6", i === 0 ? "bg-navy text-white sm:col-span-2" : "bg-bg")}>
                  <p className={cn("ltr-nums font-bold leading-none tracking-tight", i === 0 ? "text-[110px]" : "text-[64px]")}>{tk.number}</p>
                  <p className={cn("mt-3 text-[24px] font-medium", i === 0 ? "text-light" : "text-muted")}>الكاونتر {tk.counter} · <span dir="ltr">Counter {tk.counter}</span></p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] bg-white/8 p-6 ring-1 ring-white/10">
            <div className="text-[20px] font-semibold text-light">{bi("Next", "التالي")}</div>
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {line.slice(0, 6).map((tk) => (
                <li key={tk.id} className="ltr-nums rounded-2xl bg-white/10 py-4 text-center text-[30px] font-bold">{tk.number}</li>
              ))}
              {line.length === 0 && <li className="col-span-3 py-4 text-center text-[22px] text-light">—</li>}
            </ul>
          </section>
          <section className="rounded-[28px] bg-white/8 p-6 ring-1 ring-white/10">
            <div className="text-[20px] font-semibold text-light">{bi("Recently called", "تم استدعاؤهم مؤخراً")}</div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {recent.map((tk) => <li key={tk.id} className="ltr-nums rounded-xl bg-white/5 px-4 py-2 text-[20px] text-pale">{tk.number} <span className="text-[14px] text-light">→ {tk.counter}</span></li>)}
            </ul>
          </section>
          <section className="flex items-center gap-5 rounded-[28px] bg-white p-5 text-navy">
            <QrCode value={`${origin}/place/${branch.id}/services?onsite=1&code=${code}`} size={120} />
            <div>
              <p className="text-[17px] font-semibold">حاضر في الفرع؟ امسح أو أدخل</p>
              <p className="text-[13px] text-muted" dir="ltr">Joining in person? Scan or enter</p>
              <p className="mt-2 font-mono text-[34px] font-bold tracking-[0.3em]" dir="ltr">{code}</p>
            </div>
          </section>
        </div>
      </div>
      {biz.isDemo && <p className="mt-6 text-center text-[13px] text-light/70">بيانات تجريبية · Demo data</p>}
    </div>
  );
}
