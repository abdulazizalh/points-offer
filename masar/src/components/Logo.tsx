import React from "react";

/** MASAR mark: three people moving forward along a time arc. */
export function LogoMark({ size = 40, tone = "color", animated = false, className = "" }: { size?: number; tone?: "color" | "white"; animated?: boolean; className?: string }) {
  const id = React.useId().replace(/:/g, "");
  const c1 = tone === "white" ? "#FFFFFF" : "#1F3F78";
  const c2 = tone === "white" ? "#D0E1F2" : "#3A78C4";
  const c3 = tone === "white" ? "#9FC0E3" : "#6AAEEA";
  const sep = tone === "white" ? "#223A5E" : "#FFFFFF";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`arc${id}`} x1="30" y1="80" x2="92" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={tone === "white" ? "#FFFFFF" : "#2F86E8"} stopOpacity="0" />
          <stop offset="0.35" stopColor={tone === "white" ? "#D0E1F2" : "#6AAEEA"} />
          <stop offset="1" stopColor={tone === "white" ? "#FFFFFF" : "#2F86E8"} />
        </linearGradient>
      </defs>
      {/* time arc */}
      <path
        d="M47 30 A26 26 0 1 1 60 72 L44 76"
        stroke={`url(#arc${id})`}
        strokeWidth="5"
        strokeLinecap="round"
        style={animated ? { strokeDasharray: 300, animation: "draw 1.4s ease-out both" } : undefined}
      />
      {/* clock hand */}
      <path d="M70 26 V38 H79" stroke={tone === "white" ? "#FFFFFF" : "#163564"} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" style={animated ? { animation: "fade-in .6s .9s both" } : undefined} />
      {/* people back → front */}
      <g style={animated ? { animation: "rise .5s .45s both" } : undefined}>
        <circle cx="60" cy="47" r="6.4" fill={c3} stroke={sep} strokeWidth="2" />
        <path d="M51 70 V62 C51 57 55 53.5 60 53.5 C65 53.5 69 57 69 62 V67.5 Z" fill={c3} stroke={sep} strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g style={animated ? { animation: "rise .5s .3s both" } : undefined}>
        <circle cx="46" cy="50" r="7.4" fill={c2} stroke={sep} strokeWidth="2" />
        <path d="M35.5 75 V66 C35.5 60.5 40 56.5 46 56.5 C52 56.5 56.5 60.5 56.5 66 V71.5 Z" fill={c2} stroke={sep} strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g style={animated ? { animation: "rise .5s .15s both" } : undefined}>
        <circle cx="29" cy="53" r="9" fill={c1} stroke={sep} strokeWidth="2" />
        <path d="M16 80 V71 C16 64.5 21.5 60 29 60 C36.5 60 42 64.5 42 71 V76 Q29 79.5 16 80 Z" fill={c1} stroke={sep} strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Wordmark({ tone = "color", className = "" }: { tone?: "color" | "white"; className?: string }) {
  return (
    <span className={`font-semibold tracking-[0.28em] ${tone === "white" ? "text-white" : "text-navy"} ${className}`} style={{ fontFamily: "var(--font-inter)" }}>
      MASAR
    </span>
  );
}

export function Logo({ size = 32, tone = "color", showAr = false }: { size?: number; tone?: "color" | "white"; showAr?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      <LogoMark size={size} tone={tone} />
      <span className="flex flex-col leading-none">
        <Wordmark tone={tone} className="text-[15px]" />
        {showAr && <span className={`mt-1 text-[11px] ${tone === "white" ? "text-white/70" : "text-muted"}`} style={{ fontFamily: "var(--font-plex-ar)" }}>مَسار</span>}
      </span>
    </span>
  );
}
