"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Amphora,
  Banknote,
  CalendarDays,
  Car,
  ChevronRight,
  Clock,
  Coffee,
  Hospital,
  Landmark,
  MapPin,
  Scissors,
  ShoppingBag,
  ShoppingBasket,
  Star,
  Stethoscope,
  Ticket as TicketIcon,
  Users,
} from "lucide-react";
import type { Ticket, TicketStatus } from "@/lib/types";
import type { BranchView } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn, l } from "@/lib/utils";
import { Badge, BizLogo, DemoBadge } from "./ui";
import { GOOGLE_MAPS_KEY } from "@/lib/config";

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  coffee: Coffee,
  scissors: Scissors,
  stethoscope: Stethoscope,
  hospital: Hospital,
  car: Car,
  ticket: TicketIcon,
  calendar: CalendarDays,
  landmark: Landmark,
  basket: ShoppingBasket,
  bank: Banknote,
  bag: ShoppingBag,
  museum: Amphora,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const I = CATEGORY_ICONS[icon] ?? TicketIcon;
  return <I className={className} strokeWidth={1.7} />;
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useStore();
  const tone =
    status === "COMPLETED" ? "success" : status === "CALLED" || status === "IN_SERVICE" ? "navy" : status === "ARRIVED" ? "blue" : status === "WAITING" ? "blue" : status === "CANCELLED" ? "muted" : "error";
  return (
    <Badge tone={tone} dot>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function WaitText({ v, compact }: { v: BranchView; compact?: boolean }) {
  const { t } = useStore();
  if (v.slotted) return <span className="text-muted">{t(`qt.${v.branch.queueType}`)}</span>;
  if (!v.open) return <span className="text-muted">{t("common.closed")}</span>;
  if (v.estimate.high <= 2) return <span className="text-success">{t("common.now")}</span>;
  return (
    <span className="ltr-nums">
      {v.estimate.low}–{v.estimate.high}
      {compact ? "m" : ` ${t("common.min")}`}
    </span>
  );
}

const crowdColor = { low: "bg-success", medium: "bg-warning", high: "bg-error" } as const;

/** Full-width card used in lists. */
export function PlaceCard({ v }: { v: BranchView }) {
  const { t, locale } = useStore();
  return (
    <Link href={`/place/${v.branch.id}`} className="block">
      <article className="group flex gap-3.5 rounded-[20px] border border-line/70 bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
        <BizLogo initials={v.business.initials} hue={v.business.hue} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-navy">{l(v.business.name, locale)}</h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted">
                <CategoryIcon icon={v.category.icon} className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {l(v.category.name, locale)} · {l(v.area.name, locale)}
                </span>
              </p>
            </div>
            {v.business.isDemo && <DemoBadge className="mt-0.5" />}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
            <span className={cn("inline-flex items-center gap-1 font-semibold", v.open ? "text-success" : "text-muted")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", v.open ? "bg-success" : "bg-muted")} />
              {v.open ? t("common.open") : t("common.closed")}
            </span>
            {!v.slotted && v.open && (
              <span className="inline-flex items-center gap-1 text-navy">
                <Users className="h-3.5 w-3.5 text-medium" />
                <span className="ltr-nums">{v.waiting}</span>
                <span className="text-muted">{t("common.waiting")}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-navy">
              <Clock className="h-3.5 w-3.5 text-medium" />
              <WaitText v={v} />
            </span>
            {v.distance !== null && (
              <span className="inline-flex items-center gap-1 text-muted">
                <MapPin className="h-3.5 w-3.5" />
                <span className="ltr-nums">{v.distance.toFixed(1)}</span> {locale === "ar" ? "كم" : "km"}
              </span>
            )}
            {v.rating.count > 0 && (
              <span className="inline-flex items-center gap-1 text-muted">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="ltr-nums">{v.rating.avg.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

/** Compact card for horizontal carousels. */
export function PlaceTile({ v }: { v: BranchView }) {
  const { t, locale } = useStore();
  return (
    <Link href={`/place/${v.branch.id}`} className="block w-[220px] shrink-0">
      <article className="h-full overflow-hidden rounded-[20px] border border-line/70 bg-white shadow-card transition hover:-translate-y-0.5">
        <div className="relative h-[92px] overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${v.business.hue} 40% 30%), hsl(${v.business.hue} 45% 55%))` }}>
          <CategoryIcon icon={v.category.icon} className="absolute -bottom-4 end-2 h-24 w-24 text-white/12" />
          <div className="absolute start-3 top-3 flex gap-1.5">
            {v.open ? <Badge tone="white" dot>{t("common.open")}</Badge> : <Badge tone="white">{t("common.closed")}</Badge>}
          </div>
          {v.business.isDemo && <DemoBadge className="absolute end-3 top-3 border-white/30 bg-white/90" />}
          <div className="absolute bottom-3 start-3">
            <BizLogo initials={v.business.initials} hue={v.business.hue} size={38} className="ring-2 ring-white/40" />
          </div>
        </div>
        <div className="p-3">
          <h3 className="truncate text-[14px] font-semibold text-navy">{l(v.business.name, locale)}</h3>
          <p className="truncate text-[12px] text-muted">
            {l(v.branch.name, locale)}
            {v.distance !== null && (
              <>
                {" · "}
                <span className="ltr-nums">{v.distance.toFixed(1)}</span> {locale === "ar" ? "كم" : "km"}
              </>
            )}
          </p>
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-bg px-2.5 py-2">
            <span className="flex items-center gap-1 text-[12px] text-muted">
              <Users className="h-3.5 w-3.5" />
              <span className="ltr-nums font-semibold text-navy">{v.slotted || !v.open ? "—" : v.waiting}</span>
            </span>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-navy">
              <span className={cn("h-1.5 w-1.5 rounded-full", crowdColor[v.crowd])} />
              <WaitText v={v} compact />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function QrCode({ value, size = 160, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#223A5E", light: "#FFFFFF" }, errorCorrectionLevel: "M" })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [value, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={size} height={size} alt="QR code" className={className} />
  ) : (
    <div style={{ width: size, height: size }} className={cn("skeleton rounded-xl", className)} />
  );
}

// ───────── Map ─────────
type Pin = { id: string; lat: number; lng: number; label: string; hue: number; href: string; sub?: string };

declare global {
  interface Window {
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    __masarMapsLoading?: Promise<void>;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window.__masarMapsLoading) return window.__masarMapsLoading;
  window.__masarMapsLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("maps"));
    document.head.appendChild(s);
  });
  return window.__masarMapsLoading;
}

export function MapView({ pins, center, className, you }: { pins: Pin[]; center?: { lat: number; lng: number }; className?: string; you?: { lat: number; lng: number } }) {
  const { t } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !ref.current) return;
    let cancelled = false;
    loadGoogleMaps(GOOGLE_MAPS_KEY)
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = window.google;
        const map = new g.maps.Map(ref.current, { center: center ?? pins[0] ?? { lat: 29.33, lng: 48.0 }, zoom: pins.length > 1 ? 11 : 15, disableDefaultUI: true, zoomControl: true });
        const bounds = new g.maps.LatLngBounds();
        pins.forEach((p) => {
          const m = new g.maps.Marker({ position: p, map, title: p.label });
          m.addListener("click", () => (window.location.href = p.href));
          bounds.extend(p);
        });
        if (pins.length > 1) map.fitBounds(bounds, 40);
        setLive(true);
      })
      .catch(() => setLive(false));
    return () => {
      cancelled = true;
    };
  }, [pins, center]);

  if (GOOGLE_MAPS_KEY) return <div ref={ref} className={cn("overflow-hidden rounded-[20px] bg-pale", className)} aria-busy={!live} />;
  return <DemoMap pins={pins} className={className} you={you} note={t("explore.mapDemo")} />;
}

/** Projection-based schematic map of Kuwait used when no Maps key is configured. */
function DemoMap({ pins, className, you, note }: { pins: Pin[]; className?: string; you?: { lat: number; lng: number }; note: string }) {
  const pts = [...pins, ...(you ? [{ ...you, id: "you" }] : [])];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = pins.length > 1 ? 0.03 : 0.02;
  const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad, maxLng = Math.max(...lngs) + pad;
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng || 1)) * 100;
  const y = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat || 1)) * 100;
  return (
    <div className={cn("relative overflow-hidden rounded-[20px] border border-line bg-[#eaf2fa]", className)} dir="ltr">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" fill="none" stroke="#d7e4f1" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <path d="M100 0 C 88 18, 92 30, 84 44 S 90 72, 78 100 L100 100 Z" fill="#cfe2f5" />
        <path d="M0 62 C 20 58, 40 70, 60 60 S 85 50, 100 56" stroke="#ffffff" strokeWidth="1.6" fill="none" />
        <path d="M30 0 C 34 30, 26 60, 34 100" stroke="#ffffff" strokeWidth="1.4" fill="none" />
        <path d="M0 30 C 30 34, 60 26, 100 30" stroke="#ffffff" strokeWidth="1" fill="none" />
      </svg>
      {you && (
        <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x(you.lng)}%`, top: `${y(you.lat)}%` }}>
          <span className="pulse-ring relative block h-4 w-4 rounded-full text-medium/40">
            <span className="absolute inset-0.5 rounded-full border-2 border-white bg-medium" />
          </span>
        </span>
      )}
      {pins.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className="group absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${x(p.lng)}%`, top: `${y(p.lat)}%` }}
          aria-label={p.label}
        >
          <span className="flex flex-col items-center">
            <span className="mb-1 hidden max-w-[140px] truncate rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-navy shadow-card group-hover:block">{p.label}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md" style={{ background: `hsl(${p.hue} 45% 42%)` }}>
              {p.sub}
            </span>
            <span className="-mt-1 h-2 w-2 rotate-45 bg-white" />
          </span>
        </Link>
      ))}
      <p className="absolute inset-x-2 bottom-2 rounded-xl bg-white/90 px-3 py-1.5 text-center text-[11px] text-muted backdrop-blur">{note}</p>
    </div>
  );
}

export function TicketRow({ ticket, href }: { ticket: Ticket; href: string }) {
  const { db, locale } = useStore();
  const b = db.businesses.find((x) => x.id === ticket.businessId);
  const s = db.services.find((x) => x.id === ticket.serviceId);
  if (!b) return null;
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-white p-3 shadow-soft transition hover:bg-bg">
      <BizLogo initials={b.initials} hue={b.hue} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-navy">{l(b.name, locale)}</p>
        <p className="truncate text-[12px] text-muted">
          <span className="ltr-nums font-semibold text-deep">{ticket.number}</span> · {l(s?.name, locale)}
        </p>
      </div>
      <StatusBadge status={ticket.status} />
      <ChevronRight className="rtl-flip h-4 w-4 text-muted" />
    </Link>
  );
}
