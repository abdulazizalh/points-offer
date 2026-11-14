"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { BadgeCheck, CalendarClock, ChevronRight, Clock, Heart, HeartPulse, Info, MapPin, Navigation, Phone, QrCode, Share2, Star, Store, Users } from "lucide-react";
import { Badge, BizLogo, Button, Card, DemoBadge, EmptyState, IconButton, BackButton, Stars } from "@/components/ui";
import { CategoryIcon, MapView, WaitText } from "@/components/domain";
import { useStore } from "@/lib/store";
import { branchView, origin } from "@/lib/selectors";
import { bestTimeToVisit } from "@/lib/intelligence";
import { toggleFavorite } from "@/lib/engine";
import { cn, formatDate, kuwaitParts, l } from "@/lib/utils";

const DAYS = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] };

export default function PlacePage() {
  const { id } = useParams<{ id: string }>();
  const { t, db, session, locale, run, actor, toast } = useStore();
  const router = useRouter();
  const branch = db.branches.find((b) => b.id === id);
  const from = origin(db, session);
  const v = useMemo(() => (branch ? branchView(db, branch, from) : null), [db, branch, from.lat, from.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!branch || !v || v.business.verification !== "verified")
    return (
      <div>
        <div className="p-4"><BackButton /></div>
        <EmptyState icon={<Store className="h-9 w-9" />} title={t("place.notFound")} action={<Button href="/explore">{t("myq.find")}</Button>} />
      </div>
    );

  const fav = db.favorites.some((f) => f.userId === session.userId && f.kind === "branch" && f.refId === branch.id);
  const best = bestTimeToVisit(db, branch.id);
  const reviews = db.reviews.filter((r) => r.branchId === branch.id && !r.hidden).sort((a, b) => b.at - a.at);
  const siblings = db.branches.filter((b) => b.businessId === branch.businessId && b.id !== branch.id && b.active);
  const today = kuwaitParts().day;
  const healthcare = v.services.some((s) => (s.queueType ?? branch.queueType) === "healthcare") || branch.queueType === "healthcare";
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`;

  const onFav = () => {
    if (!session.userId) return router.push(`/auth/login?next=/place/${branch.id}`);
    const r = run((d) => toggleFavorite(d, actor, "branch", branch.id));
    if (r.ok) toast(r.data ? t("place.favorited") : t("common.done"), "info");
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: l(v.business.name, locale), url });
      else {
        await navigator.clipboard.writeText(url);
        toast(t("common.copy") + " ✓", "info");
      }
    } catch {}
  };

  return (
    <div className="animate-fade-in pb-28">
      {/* Cover */}
      <div className="relative h-52 overflow-hidden" style={{ background: `linear-gradient(140deg, hsl(${v.business.hue} 42% 26%), hsl(${v.business.hue} 46% 50%))` }}>
        <CategoryIcon icon={v.category.icon} className="absolute -bottom-10 -end-6 h-64 w-64 text-white/10" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span className="rounded-full bg-white/90 backdrop-blur"><BackButton className="ms-0" /></span>
          <div className="flex gap-2">
            <span className="rounded-full bg-white/90 backdrop-blur"><IconButton label="Share" onClick={share}><Share2 className="h-[18px] w-[18px]" /></IconButton></span>
            <span className="rounded-full bg-white/90 backdrop-blur">
              <IconButton label={fav ? t("place.favorited") : t("place.favorite")} onClick={onFav}>
                <Heart className={cn("h-[18px] w-[18px]", fav && "fill-error text-error")} />
              </IconButton>
            </span>
          </div>
        </div>
      </div>

      <div className="relative -mt-12 px-5">
        <Card className="p-4">
          <div className="flex items-start gap-3.5">
            <BizLogo initials={v.business.initials} hue={v.business.hue} size={64} className="-mt-10 ring-4 ring-white" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[19px] font-semibold text-navy">{l(v.business.name, locale)}</h1>
                <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-medium" aria-label={t("biz.ver.verified")} />
              </div>
              <p className="mt-0.5 text-[13px] text-muted">{l(v.category.name, locale)} · {l(branch.name, locale)}</p>
            </div>
            {v.business.isDemo && <DemoBadge />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={v.open ? "success" : "muted"} dot>{v.open ? t("common.open") : t("common.closed")}</Badge>
            <Badge tone="blue">{t(`qt.${branch.queueType}`)}</Badge>
            {v.rating.count > 0 ? (
              <span className="inline-flex items-center gap-1 text-[12.5px] text-muted"><Star className="h-3.5 w-3.5 fill-warning text-warning" /><span className="ltr-nums font-semibold text-navy">{v.rating.avg.toFixed(1)}</span> ({t("place.reviews", { n: v.rating.count })})</span>
            ) : (
              <span className="text-[12px] text-muted">{t("place.noReviews")}</span>
            )}
          </div>

          {/* Live stats */}
          {!v.slotted && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-bg py-3 text-center rtl:divide-x-reverse">
              <div>
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted"><Users className="h-3.5 w-3.5" />{t("place.waiting")}</p>
                <p className="ltr-nums mt-1 text-[20px] font-bold text-navy">{v.open ? v.waiting : "—"}</p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted"><Clock className="h-3.5 w-3.5" />{t("place.estWait")}</p>
                <p className="mt-1 text-[16px] font-bold text-navy"><WaitText v={v} /></p>
              </div>
              <div>
                <p className="text-[11px] text-muted">{t("ticket.serving")}</p>
                <p className="ltr-nums mt-1 text-[20px] font-bold text-navy">{v.serving ?? "—"}</p>
              </div>
            </div>
          )}
          {v.business.isDemo && <p className="mt-2 text-center text-[11px] text-[#8a5b12]">{t("demo.banner")}</p>}
        </Card>

        {healthcare && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-pale/50 p-3.5 text-[13px] text-deep">
            <HeartPulse className="mt-0.5 h-4 w-4 shrink-0" /> {t("place.medicalNote")}
          </div>
        )}
        {!branch.remoteBooking && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-warning/10 p-3.5 text-[13px] text-[#8a5b12]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t("place.remoteOff")}
          </div>
        )}
        {branch.remoteBooking && !v.open && !v.slotted && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[#eef3f8] p-3.5 text-[13px] text-muted">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" /> {t("place.closedNow")}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Button variant="outline" size="md" href={`/place/${branch.id}/services`} className="flex-col !h-auto py-3 text-[12px]" icon={<Store className="h-5 w-5 text-medium" />}>{t("place.viewServices")}</Button>
          <a href={dirUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-[12px] font-semibold text-navy hover:bg-bg"><Navigation className="h-5 w-5 text-medium" />{t("place.directions")}</a>
          <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-[12px] font-semibold text-navy hover:bg-bg"><Phone className="h-5 w-5 text-medium" />{t("place.contact")}</a>
        </div>

        {v.business.description[locale] && (
          <section className="mt-6">
            <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("place.about")}</h2>
            <p className="text-[14px] leading-relaxed text-muted">{l(v.business.description, locale)}</p>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-navy">{t("place.services")}</h2>
            <Link href={`/place/${branch.id}/services`} className="text-[13px] font-medium text-medium">{t("common.seeAll")}</Link>
          </div>
          <Card className="divide-y divide-line">
            {v.services.slice(0, 3).map((s) => (
              <Link key={s.id} href={`/place/${branch.id}/services`} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-navy">{l(s.name, locale)}</p>
                  <p className="text-[12px] text-muted">{t("service.duration", { n: s.durationMin })} · {t(`qt.${s.queueType ?? branch.queueType}`)}</p>
                </div>
                <ChevronRight className="rtl-flip h-4 w-4 text-muted" />
              </Link>
            ))}
          </Card>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-navy"><CalendarClock className="h-4.5 w-4.5 text-medium" />{t("place.bestTime")}</h2>
          <Card className="p-4">
            {best.available ? (
              <>
                <div className="flex h-24 items-end gap-[3px]" dir="ltr" role="img" aria-label={t("place.bestTime")}>
                  {best.hours.map((h) => {
                    const max = Math.max(...best.hours.map((x) => x.value));
                    const isNow = h.hour === kuwaitParts().h;
                    return (
                      <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          title={`${h.hour}:00 · ${t(`place.crowd${h.level[0].toUpperCase()}${h.level.slice(1)}`)}`}
                          className={cn("w-full rounded-t-md transition-all", h.level === "low" ? "bg-success/70" : h.level === "medium" ? "bg-warning/70" : "bg-error/70", isNow && "ring-2 ring-navy ring-offset-1")}
                          style={{ height: `${Math.max(8, (h.value / max) * 80)}px` }}
                        />
                        <span className="text-[9px] text-muted">{h.hour % 3 === 0 ? h.hour : ""}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-muted">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success/70" />{t("place.crowdLow")}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning/70" />{t("place.crowdMedium")}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error/70" />{t("place.crowdHigh")}</span>
                </div>
                {best.best.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {best.best.map((h) => <Badge key={h} tone="success"><span className="ltr-nums">{String(h).padStart(2, "0")}:00</span></Badge>)}
                  </div>
                )}
                <p className="mt-3 text-[11.5px] text-muted">{t("place.bestTimeNote", { n: best.samples.toLocaleString(), src: v.business.isDemo ? t("place.historySrc") : t("place.historySrcReal") })}</p>
              </>
            ) : (
              <p className="text-[13px] text-muted">{t("place.bestTimeNone")}</p>
            )}
          </Card>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("place.hours")}</h2>
          <Card className="divide-y divide-line">
            {[...branch.hours].sort((a, b) => ((a.day + 1) % 7) - ((b.day + 1) % 7)).map((h) => (
              <div key={h.day} className={cn("flex justify-between px-4 py-2.5 text-[13.5px]", h.day === today ? "font-semibold text-navy" : "text-muted")}>
                <span>{DAYS[locale][h.day]}</span>
                <span className="ltr-nums">{h.closed ? t("common.closed") : `${h.open} – ${h.close}`}</span>
              </div>
            ))}
          </Card>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("place.location")}</h2>
          <MapView className="h-44" pins={[{ id: branch.id, lat: branch.lat, lng: branch.lng, label: l(v.business.name, locale), hue: v.business.hue, href: dirUrl, sub: v.business.initials }]} />
          <p className="mt-2 flex items-start gap-1.5 text-[13px] text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-medium" />{l(branch.address, locale)}, {l(v.area.name, locale)}</p>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("place.reviews", { n: reviews.length })}</h2>
          {reviews.length === 0 ? (
            <p className="text-[13px] text-muted">{t("place.noReviews")}</p>
          ) : (
            <div className="space-y-2.5">
              {reviews.slice(0, 4).map((r) => (
                <Card key={r.id} className="p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-navy">{r.authorName.split(" ")[0]}</span>
                    <Stars value={r.rating} size={12} />
                  </div>
                  {r.text && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{r.text}</p>}
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-success"><BadgeCheck className="h-3 w-3" />{t("review.verified")} · <span className="text-muted">{formatDate(r.at, locale)}</span></p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {siblings.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-[15px] font-semibold text-navy">{t("place.otherBranches")}</h2>
            {siblings.map((s) => (
              <Link key={s.id} href={`/place/${s.id}`} className="flex items-center justify-between rounded-2xl border border-line bg-white p-3.5 text-[14px] text-navy">
                <span>{l(s.name, locale)} · <span className="text-muted">{l(db.areas.find((a) => a.id === s.areaId)?.name, locale)}</span></span>
                <ChevronRight className="rtl-flip h-4 w-4 text-muted" />
              </Link>
            ))}
          </section>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[460px] border-t border-line bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur sm:absolute sm:rounded-b-[36px]">
        {branch.remoteBooking ? (
          <div className="flex gap-2">
            <Button size="lg" full href={`/place/${branch.id}/services`} disabled={!v.bookable}>{t("place.book")}</Button>
            <Button size="lg" variant="outline" href={`/place/${branch.id}/services?onsite=1`} aria-label={t("place.checkin")} className="!px-4" icon={<QrCode className="h-5 w-5" />} disabled={!v.open} />
          </div>
        ) : (
          <Button size="lg" full href={`/place/${branch.id}/services?onsite=1`} icon={<QrCode className="h-5 w-5" />} disabled={!v.open}>{t("place.checkin")}</Button>
        )}
      </div>
    </div>
  );
}
