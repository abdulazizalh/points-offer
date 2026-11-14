"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck, BarChart3, Bell, Brain, Building2, CalendarClock, Clock, Gauge, HeartPulse, Languages, MapPin, MonitorPlay,
  QrCode, ShieldCheck, Smartphone, Sparkles, Ticket, Timer, Users,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { activeTickets } from "@/lib/selectors";
import { cn } from "@/lib/utils";

type Bi = [string, string]; // [ar, en]

const FEATURES: Array<{ icon: React.ComponentType<{ className?: string }>; t: Bi; d: Bi }> = [
  { icon: Smartphone, t: ["احجز دورك عن بُعد", "Book remotely"], d: ["اختر المكان والخدمة واحصل على رقمك وأنت في البيت.", "Pick a place and service and get your number from home."] },
  { icon: Ticket, t: ["تذكرة رقمية حيّة", "Live digital ticket"], d: ["تتابع الرقم الحالي وعدد الأشخاص قبلك والوقت المتوقع لحظة بلحظة.", "Follow now-serving, people ahead and the estimate in real time."] },
  { icon: Brain, t: ["توقع ذكي للانتظار", "Smart wait prediction"], d: ["نطاق زمني مبني على الموظفين ومدة الخدمة وأوقات الذروة والسجل السابق.", "A time range from staff, service time, peak hours and history."] },
  { icon: Bell, t: ["تنبيهات ذكية", "Smart alerts"], d: ["باقي 5 قبلك، دورك يقترب، دورك التالي، تم استدعاؤك.", "5 ahead, approaching, you're next, you've been called."] },
  { icon: QrCode, t: ["تأكيد وصول عادل", "Fair arrival check-in"], d: ["رمز يتغير كل 5 دقائق يظهر فقط في الفرع — ما أحد يأكد وصوله من البيت.", "A code that rotates every 5 minutes, shown only on-site."] },
  { icon: Timer, t: ["تأجيل وإلغاء", "Postpone & cancel"], d: ["تأجيل مرة واحدة يرجّعك للخلف فقط، وإلغاء قبل بدء الخدمة.", "Postpone once (only moves you back) or cancel before service."] },
  { icon: CalendarClock, t: ["أفضل وقت للزيارة", "Best time to visit"], d: ["ازدحام منخفض/متوسط/عالي حسب الساعة من البيانات السابقة.", "Low / medium / high crowd by hour from past data."] },
  { icon: HeartPulse, t: ["طوابير صحية آمنة", "Safe healthcare queues"], d: ["الأولوية الطبية بيد الطاقم الطبي فقط ومع تسجيل السبب.", "Medical priority only by clinical staff, with a logged reason."] },
  { icon: Gauge, t: ["رصد الازدحام للمنشأة", "Crowd detection"], d: ["تنبيه عند الزيادة المفاجئة أو بطء الخدمة أو امتلاء الطابور.", "Alerts for surges, slow service and near-capacity queues."] },
  { icon: Languages, t: ["عربي وإنجليزي", "Arabic & English"], d: ["واجهة كاملة من اليمين لليسار ومن اليسار لليمين.", "Full RTL and LTR interfaces."] },
];

const SECTIONS: Array<{ icon: React.ComponentType<{ className?: string }>; t: Bi; d: Bi; href: string; cta: Bi; tone: string }> = [
  { icon: Smartphone, t: ["تطبيق العملاء", "Customer app"], d: ["سجّل، احجز، تابع تذكرتك، أكّد وصولك وقيّم الخدمة.", "Sign up, book, track, check in and rate."], href: "/start", cta: ["جرّب التطبيق", "Try the app"], tone: "from-navy to-deep" },
  { icon: Building2, t: ["لوحة المنشأة", "Business dashboard"], d: ["أدر الطابور مباشرة: استدعاء، بدء، إنهاء، تخطي، عميل حضوري، تحليلات.", "Run the live queue, services, staff, branches and analytics."], href: "/business", cta: ["افتح اللوحة", "Open dashboard"], tone: "from-deep to-medium" },
  { icon: MonitorPlay, t: ["شاشة الانتظار", "Waiting-room display"], d: ["شاشة تلفزيون للفرع: الرقم الحالي، التالي، ورمز تسجيل الحضور.", "TV screen: now serving, next and the check-in code."], href: "/display/br_oasis_salmiya", cta: ["افتح الشاشة", "Open display"], tone: "from-[#1b2f4d] to-navy" },
  { icon: ShieldCheck, t: ["لوحة الإدارة", "Admin console"], d: ["توثيق المنشآت، المستخدمون، البلاغات، التقييمات وسجل التدقيق.", "Verify businesses, users, reports, reviews and audit log."], href: "/admin", cta: ["افتح الإدارة", "Open admin"], tone: "from-medium to-accent" },
];

const PAGES: Array<{ group: Bi; items: Array<[string, Bi]> }> = [
  { group: ["تطبيق العملاء", "Customer app"], items: [
    ["/start", ["شاشة البداية", "Splash"]], ["/onboarding", ["شاشات التعريف", "Onboarding"]], ["/auth/login", ["تسجيل الدخول", "Login"]], ["/auth/signup", ["إنشاء حساب", "Sign up"]],
    ["/home", ["الرئيسية", "Home"]], ["/explore", ["استكشف + خريطة", "Explore + map"]], ["/search", ["البحث", "Search"]], ["/place/br_oasis_salmiya", ["صفحة المنشأة", "Place details"]],
    ["/place/br_oasis_salmiya/services", ["اختيار الخدمة", "Service selection"]], ["/place/br_heritage_kc", ["دخول بموعد (متحف)", "Timed entry (museum)"]], ["/place/br_shifa_hawalli", ["طابور صحي (عيادة)", "Healthcare (clinic)"]],
    ["/queue", ["دوري (التذاكر)", "My queue"]], ["/notifications", ["التنبيهات", "Notifications"]], ["/history", ["السجل", "History"]], ["/favorites", ["المفضلة", "Favorites"]],
    ["/profile", ["حسابي", "Profile"]], ["/help", ["المساعدة", "Help & FAQ"]], ["/legal/privacy", ["الخصوصية", "Privacy"]],
  ] },
  { group: ["المنشأة والإدارة", "Business & admin"], items: [
    ["/business", ["نظرة عامة", "Overview"]], ["/business/queue", ["الطابور المباشر", "Live queue"]], ["/business/services", ["الخدمات", "Services"]], ["/business/employees", ["الموظفون", "Employees"]],
    ["/business/branches", ["الفروع", "Branches"]], ["/business/analytics", ["التحليلات", "Analytics"]], ["/business/register", ["تسجيل منشأة", "Register business"]],
    ["/display/br_oasis_salmiya", ["شاشة الانتظار", "TV display"]], ["/admin", ["لوحة الإدارة", "Admin console"]],
  ] },
];

export default function Showcase() {
  const { locale, setSession, db, session, user } = useStore();
  const i = locale === "ar" ? 0 : 1;
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), [db]);
  const tickets = db.tickets.filter((t) => now && now - t.createdAt < 864e5).length;
  const open = new Set(db.tickets.filter((t) => ["WAITING", "ARRIVED", "CALLED", "IN_SERVICE"].includes(t.status)).map((t) => t.branchId)).size;
  const mine = activeTickets(db, session.userId)[0];

  return (
    <div className="min-h-dvh bg-bg text-navy">
      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2" dir="ltr">
            <LogoMark size={34} />
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-[0.28em]" style={{ fontFamily: "var(--font-inter)" }}>MASAR</span>
              <span className="mt-1 text-[11px] text-muted" style={{ fontFamily: "var(--font-plex-ar)" }}>مَسار</span>
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSession({ locale: locale === "ar" ? "en" : "ar" })} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium">
              <Languages className="h-3.5 w-3.5" /> {locale === "ar" ? "English" : "العربية"}
            </button>
            <Link href={user ? "/home" : "/start"} className="hidden rounded-full bg-navy px-4 py-2 text-[13px] font-semibold text-white sm:inline-flex">{["جرّب الآن", "Try it now"][i]}</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-[#2b4a75] to-deep text-white">
        <div className="absolute -top-24 end-0 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-24 start-10 h-72 w-72 rounded-full bg-light/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] text-pale ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> {["منصة إدارة الطوابير الذكية — الكويت", "Smart queue platform — Kuwait"][i]}
            </span>
            <h1 className="mt-5 text-[38px] font-semibold leading-[1.15] sm:text-[48px]">{["وقتك. دورك.", "Your Time. Your Turn."][i]}</h1>
            <p className="mt-2 text-[16px] text-light" dir="ltr">{i === 0 ? "Your Time. Your Turn." : "وقتك. دورك."}</p>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-pale">
              {["مَسار يخليك تحجز دورك في المطاعم والصالونات والعيادات والبنوك والجهات الحكومية عن بُعد، وتتابعه مباشرة، وتوصل بالوقت المناسب بدل الوقوف في الطابور.",
                "MASAR lets you book your turn at restaurants, salons, clinics, banks and service centres remotely, track it live, and arrive just in time — no standing in line."][i]}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={mine ? `/queue/${mine.id}` : user ? "/home" : "/start"} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-semibold text-navy shadow-float">
                <Smartphone className="h-5 w-5" /> {mine ? ["تذكرتي الحالية", "My live ticket"][i] : ["جرّب تطبيق العملاء", "Try the customer app"][i]}
              </Link>
              <a href="#all" className="inline-flex h-12 items-center rounded-2xl px-5 text-[15px] font-semibold text-white ring-1 ring-white/30 hover:bg-white/10">{["كل الصفحات", "All pages"][i]}</a>
            </div>
            <p className="mt-5 text-[12.5px] text-light">{["نسخة تجريبية تفاعلية — رمز التحقق: ", "Interactive demo — verification code: "][i]}<b className="font-mono text-white">123456</b></p>
          </div>

          {/* phone mock with live numbers */}
          <div className="mx-auto w-full max-w-[300px]">
            <div className="rounded-[40px] bg-[#0f1d33] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
              <div className="overflow-hidden rounded-[30px] bg-bg text-navy">
                <div className="bg-gradient-to-br from-navy to-deep px-5 pb-6 pt-6 text-white">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-light">{["رقم التذكرة", "Ticket number"][i]}</p>
                  <p className="ltr-nums mt-1 text-[44px] font-bold leading-none">A-024</p>
                  <p className="mt-2 text-[12px] text-pale">{["قص الشعر · صالون الواحة", "Haircut · Oasis Grooming"][i]}</p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white p-3 shadow-soft"><p className="text-[10px] text-muted">{["قبلك", "Ahead"][i]}</p><p className="ltr-nums text-[24px] font-bold">5</p></div>
                    <div className="rounded-2xl bg-white p-3 shadow-soft"><p className="text-[10px] text-muted">{["الانتظار", "Wait"][i]}</p><p className="text-[18px] font-bold"><span className="ltr-nums">18–24</span> <span className="text-[11px] text-muted">{["د", "min"][i]}</span></p></div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-pale"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-accent to-navy rtl:bg-gradient-to-l" /></div>
                  <div className="flex items-center gap-2 rounded-2xl bg-success/10 p-3 text-[12px] font-medium text-success"><Bell className="h-4 w-4" />{["دورك يقترب — باقي 3 قبلك", "Your turn is approaching — 3 ahead"][i]}</div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold">
                    <span className="rounded-xl bg-navy py-2 text-center text-white">{["تأكيد الوصول", "Arrive"][i]}</span>
                    <span className="rounded-xl border border-line bg-white py-2 text-center">{["تأجيل", "Postpone"][i]}</span>
                    <span className="rounded-xl border border-line bg-white py-2 text-center text-error">{["إلغاء", "Cancel"][i]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* live stats */}
      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-white p-4 shadow-card ring-1 ring-line sm:grid-cols-4">
          {[
            [Building2, db.businesses.filter((b) => b.verification === "verified").length, ["منشأة مشاركة", "Participating places"]],
            [MapPin, db.branches.length, ["فرع", "Branches"]],
            [Users, tickets, ["تذكرة اليوم", "Tickets today"]],
            [Clock, open, ["طابور نشط الآن", "Active queues now"]],
          ].map(([Icon, n, label], k) => {
            const I = Icon as React.ComponentType<{ className?: string }>;
            return (
              <div key={k} className="flex items-center gap-3 rounded-2xl p-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-pale/60 text-deep"><I className="h-5 w-5" /></span>
                <div><p className="ltr-nums text-[22px] font-bold leading-none">{n as number}</p><p className="mt-1 text-[12px] text-muted">{(label as Bi)[i]}</p></div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11.5px] text-[#8a5b12]">{["الأرقام من بيانات تجريبية تتحدث مباشرة داخل العرض", "Numbers come from live-updating demo data"][i]}</p>
      </section>

      {/* journey */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-center text-[28px] font-semibold">{["رحلة المستخدم في 6 خطوات", "The journey in 6 steps"][i]}</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            [["اختر المكان", "Choose a place"], ["تصفح الفئات أو ابحث، وشوف الانتظار الحالي.", "Browse categories and see the current wait."]],
            [["اختر الخدمة", "Pick a service"], ["كل خدمة بمدتها والوقت المتوقع.", "Each service with duration and estimate."]],
            [["احصل على رقمك", "Get your number"], ["تذكرة رقمية فورية.", "Instant digital ticket."]],
            [["تابع مباشرة", "Track live"], ["الطابور يتحرك وتوصلك التنبيهات.", "The queue moves and alerts arrive."]],
            [["أكّد وصولك", "Confirm arrival"], ["بالرمز الظاهر على شاشة الفرع.", "With the code on the branch screen."]],
            [["قيّم تجربتك", "Rate the visit"], ["تقييم موثّق بعد اكتمال الخدمة.", "A verified review after service."]],
          ] as Array<[Bi, Bi]>).map(([tt, dd], k) => (
            <li key={k} className="flex gap-4 rounded-[20px] bg-white p-5 shadow-card ring-1 ring-line/70">
              <span className="ltr-nums grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy text-[15px] font-bold text-white">{k + 1}</span>
              <div><p className="text-[16px] font-semibold">{tt[i]}</p><p className="mt-1 text-[13.5px] text-muted">{dd[i]}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-center text-[28px] font-semibold">{["المزايا", "Features"][i]}</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f, k) => (
            <div key={k} className="rounded-[20px] bg-white p-5 shadow-card ring-1 ring-line/70">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-navy to-medium text-white"><f.icon className="h-5 w-5" /></span>
              <p className="mt-4 text-[15px] font-semibold">{f.t[i]}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.d[i]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* platform */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-center text-[28px] font-semibold">{["منصة متكاملة — جرّب كل جزء", "One platform — try every part"][i]}</h2>
        <p className="mt-2 text-center text-[14px] text-muted">{["افتح تطبيق العملاء ولوحة المنشأة في تبويبين: احجز من الأول وخدّم نفسك من الثاني وشوف التحديث المباشر.", "Open the customer app and the dashboard in two tabs: book in one, serve yourself in the other."][i]}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s, k) => (
            <Link key={k} href={s.href} target={s.href.startsWith("/display") ? "_blank" : undefined} className={cn("group flex flex-col rounded-[24px] bg-gradient-to-br p-6 text-white shadow-float transition hover:-translate-y-1", s.tone)}>
              <s.icon className="h-8 w-8" />
              <p className="mt-5 text-[18px] font-semibold">{s.t[i]}</p>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-pale">{s.d[i]}</p>
              <span className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-navy">{s.cta[i]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* queue types */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="rounded-[24px] bg-white p-6 shadow-card ring-1 ring-line/70">
          <h2 className="text-[20px] font-semibold">{["5 أنواع طوابير لكل القطاعات", "5 queue types for every sector"][i]}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {([["طابور خدمة", "Service queue"], ["مواعيد", "Appointments"], ["دخول بموعد وسعة محدودة", "Timed entry"], ["طابور حضوري", "Walk-in"], ["رعاية صحية", "Healthcare"]] as Bi[]).map((q, k) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-pale/60 px-3.5 py-2 text-[13px] font-medium text-deep"><BadgeCheck className="h-4 w-4" />{q[i]}</span>
            ))}
          </div>
          <div className="mt-6 grid gap-3 text-[13.5px] text-muted sm:grid-cols-3">
            <p className="flex gap-2"><BarChart3 className="h-5 w-5 shrink-0 text-medium" />{["تحليلات يومية وأسبوعية وشهرية للمنشأة.", "Daily, weekly and monthly analytics."][i]}</p>
            <p className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-medium" />{["صلاحيات حسب الدور وسجل تدقيق لكل إجراء.", "Role-based access and a full audit log."][i]}</p>
            <p className="flex gap-2"><Users className="h-5 w-5 shrink-0 text-medium" />{["كل منشأة تشوف بياناتها فقط.", "Each business sees only its own data."][i]}</p>
          </div>
        </div>
      </section>

      {/* all pages */}
      <section id="all" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-center text-[28px] font-semibold">{["كل الصفحات", "All pages"][i]}</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {PAGES.map((g, k) => (
            <div key={k} className="rounded-[24px] bg-white p-5 shadow-card ring-1 ring-line/70">
              <p className="mb-3 text-[15px] font-semibold">{g.group[i]}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.items.map(([href, label]) => (
                  <Link key={href} href={href} className="rounded-xl border border-line px-3 py-2.5 text-[13px] font-medium transition hover:border-light hover:bg-bg">{label[i]}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line bg-white py-8 text-center text-[12px] text-muted">
        <p dir="ltr">MASAR · مَسار — Your Time. Your Turn.</p>
        <p className="mt-1">{["نسخة تجريبية: جميع المنشآت والبيانات نموذجية لأغراض العرض.", "Demo build: all establishments and data are samples for demonstration."][i]}</p>
      </footer>
    </div>
  );
}
