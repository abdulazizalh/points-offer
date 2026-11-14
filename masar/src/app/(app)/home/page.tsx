"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, Clock, MapPin, Search, Sparkles, Users } from "lucide-react";
import { Avatar, BizLogo, Chip, SectionTitle } from "@/components/ui";
import { CategoryIcon, PlaceTile, StatusBadge } from "@/components/domain";
import { LocationSheet } from "@/components/LocationSheet";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { activeTickets, origin, publicBranches, sortBranches } from "@/lib/selectors";
import { peopleAhead, ticketEstimate } from "@/lib/engine";
import { serviceMinutes } from "@/lib/intelligence";
import { l } from "@/lib/utils";

export default function Home() {
  const { t, db, session, user, locale } = useStore();
  const [locOpen, setLocOpen] = useState(false);
  const router = useRouter();
  const from = origin(db, session);
  const views = useMemo(() => publicBranches(db, from), [db, from]);
  const nearby = sortBranches(views, "nearest").slice(0, 8);
  const lowest = sortBranches(views.filter((v) => v.open && !v.slotted && v.bookable), "lowest").slice(0, 8);
  const recent = db.recentBranchIds.map((id) => views.find((v) => v.branch.id === id)).filter(Boolean).slice(0, 6) as typeof views;
  const active = activeTickets(db, session.userId)[0];
  const unread = db.notifications.some((n) => n.userId === session.userId && !n.read);
  const areaName = session.gps ? t("home.useGps") : l(db.areas.find((a) => a.id === session.areaId)?.name, locale);
  const featured = useMemo(
    () =>
      views
        .filter((v) => v.open && v.bookable && !v.slotted)
        .flatMap((v) => v.services.filter((s) => s.remoteBooking).slice(0, 1).map((s) => ({ v, s })))
        .sort((a, b) => a.v.estimate.mid - b.v.estimate.mid)
        .slice(0, 4),
    [views],
  );

  return (
    <div className="animate-fade-in">
      <header className="bg-gradient-to-b from-white to-bg px-5 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <Logo size={30} />
          <div className="flex items-center gap-1">
            <Link href="/notifications" aria-label={t("nav.notifications")} className="relative grid h-10 w-10 place-items-center rounded-full text-navy hover:bg-pale/60">
              <Bell className="h-[21px] w-[21px]" />
              {unread && <span className="absolute end-2.5 top-2.5 h-2 w-2 rounded-full bg-error ring-2 ring-white" />}
            </Link>
            <Link href="/profile" aria-label={t("nav.profile")}>
              {user ? <Avatar name={user.name} hue={user.avatarHue} size={36} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-pale text-deep"><Users className="h-4 w-4" /></span>}
            </Link>
          </div>
        </div>
        <div className="mt-5">
          <h1 className="text-[24px] font-semibold text-navy">{user ? t("home.hello", { name: user.name.split(" ")[0] }) : t("home.helloGuest")} 👋</h1>
          <button onClick={() => setLocOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted hover:text-navy">
            <MapPin className="h-3.5 w-3.5 text-medium" /> {t("home.location")}: <span className="font-semibold text-navy">{areaName}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <Link href="/search" className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-line bg-white px-4 text-[14px] text-muted shadow-soft transition hover:border-light">
          <Search className="h-[18px] w-[18px] text-medium" /> {t("home.search")}
        </Link>
      </header>

      {active && <ActiveTicketCard id={active.id} />}

      <section className="mt-5">
        <SectionTitle title={t("home.categories")} action={t("common.seeAll")} href="/explore" />
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-4">
          {db.categories.filter((c) => c.active).sort((a, b) => a.sort - b.sort).map((c) => (
            <Link key={c.id} href={`/explore?cat=${c.id}`} className="group flex flex-col items-center gap-2 text-center">
              <span className="grid h-[58px] w-[58px] place-items-center rounded-[20px] border border-line/70 bg-white text-deep shadow-soft transition group-hover:-translate-y-0.5 group-hover:border-light group-hover:text-navy">
                <CategoryIcon icon={c.icon} className="h-[26px] w-[26px]" />
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-navy">{l(c.name, locale)}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
        <Chip onClick={() => router.push("/explore?sort=nearest")}>{t("filter.nearest")}</Chip>
        <Chip onClick={() => router.push("/explore?sort=lowest")}>{t("filter.lowest")}</Chip>
        <Chip onClick={() => router.push("/explore?sort=popular")}>{t("filter.popular")}</Chip>
        <Chip onClick={() => router.push("/explore?open=1")}>{t("filter.available")}</Chip>
      </div>

      <Carousel title={t("home.nearby")} href="/explore?sort=nearest" items={nearby} />
      {lowest.length > 0 && <Carousel title={t("home.lowest")} href="/explore?sort=lowest" items={lowest} />}
      {recent.length > 0 && <Carousel title={t("home.recent")} items={recent} />}

      {featured.length > 0 && (
        <section className="mt-7 pb-4">
          <SectionTitle title={t("home.featured")} />
          <div className="space-y-2.5 px-5">
            {featured.map(({ v, s }) => (
              <Link key={s.id + v.branch.id} href={`/book/${v.branch.id}/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-white p-3 shadow-soft transition hover:bg-bg">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-pale/60 text-deep"><Sparkles className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-navy">{l(s.name, locale)}</p>
                  <p className="truncate text-[12px] text-muted">{l(v.business.name, locale)} · {t("service.duration", { n: Math.round(serviceMinutes(db, s, v.branch.id)) })}</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[12px] font-semibold text-navy">
                  <Clock className="h-3.5 w-3.5 text-medium" />
                  <span className="ltr-nums">{v.estimate.low}–{v.estimate.high}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}

function Carousel({ title, href, items }: { title: string; href?: string; items: ReturnType<typeof publicBranches> }) {
  const { t } = useStore();
  return (
    <section className="mt-7">
      <SectionTitle title={title} action={href ? t("common.seeAll") : undefined} href={href} />
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
        {items.map((v) => <PlaceTile key={v.branch.id} v={v} />)}
      </div>
    </section>
  );
}

function ActiveTicketCard({ id }: { id: string }) {
  const { t, db, locale } = useStore();
  const tk = db.tickets.find((x) => x.id === id);
  if (!tk) return null;
  const b = db.businesses.find((x) => x.id === tk.businessId)!;
  const ahead = peopleAhead(db, tk);
  const est = ticketEstimate(db, tk);
  return (
    <Link href={`/queue/${tk.id}`} className="mx-5 mt-1 block animate-slide-up overflow-hidden rounded-[22px] bg-gradient-to-br from-navy to-deep p-4 text-white shadow-float">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-light">{t("home.activeTicket")}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-pale"><span className="pulse-ring relative h-2 w-2 rounded-full bg-success text-success/60" />{t("ticket.live")}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <BizLogo initials={b.initials} hue={b.hue} size={42} className="ring-2 ring-white/20" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{l(b.name, locale)}</p>
          <div className="mt-0.5"><StatusBadge status={tk.status} /></div>
        </div>
        <div className="text-end">
          <p className="ltr-nums text-[26px] font-bold leading-none">{tk.number}</p>
          {(tk.status === "WAITING" || tk.status === "ARRIVED") && (
            <p className="mt-1 text-[11px] text-light"><span className="ltr-nums">{ahead}</span> {t("ticket.ahead")} · <span className="ltr-nums">{est.low}–{est.high}</span> {t("common.min")}</p>
          )}
        </div>
        <ChevronRight className="rtl-flip h-5 w-5 text-light" />
      </div>
    </Link>
  );
}
