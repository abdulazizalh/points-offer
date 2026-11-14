"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Bell, Compass, House, Ticket, UserRound, WifiOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { activeTickets } from "@/lib/selectors";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", icon: House, key: "nav.home" },
  { href: "/explore", icon: Compass, key: "nav.explore" },
  { href: "/queue", icon: Ticket, key: "nav.queue" },
  { href: "/notifications", icon: Bell, key: "nav.notifications" },
  { href: "/profile", icon: UserRound, key: "nav.profile" },
];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t, online, mode } = useStore();
  const showNav = TABS.some((x) => x.href === path);
  return (
    <div className="min-h-dvh bg-[#e9f1f9] sm:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-bg sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[36px] sm:shadow-float sm:ring-1 sm:ring-line">
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-navy px-4 py-2 text-[12px] font-medium text-white" role="status">
            <WifiOff className="h-3.5 w-3.5" /> {t("state.offline")}
          </div>
        )}
        {showNav && mode === "demo" && (
          <div className="border-b border-warning/20 bg-[#fdf6ea] px-4 py-1.5 text-center text-[11px] leading-snug text-[#8a5b12]">{t("demo.banner")}</div>
        )}
        <main className={cn("flex-1", showNav && "pb-24")}>{children}</main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

function BottomNav() {
  const path = usePathname();
  const { t, db, session } = useStore();
  const unread = db.notifications.filter((n) => n.userId === session.userId && !n.read).length;
  const active = activeTickets(db, session.userId).length;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[460px] border-t border-line/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:absolute sm:rounded-b-[36px]" aria-label="Main">
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, icon: Icon, key }) => {
          const on = path === href;
          const count = href === "/notifications" ? unread : href === "/queue" ? active : 0;
          return (
            <li key={href}>
              <Link href={href} className={cn("relative flex flex-col items-center gap-1 pb-2.5 pt-3 text-[10.5px] font-medium transition", on ? "text-navy" : "text-muted hover:text-navy")} aria-current={on ? "page" : undefined}>
                {on && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-navy" />}
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.2 : 1.7} />
                  {count > 0 && (
                    <span className={cn("absolute -end-2 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white", href === "/queue" ? "bg-medium" : "bg-error")}>
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Redirects to sign-in when there is no signed-in customer. */
export function RequireUser({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!user) router.replace(`/auth/login?next=${encodeURIComponent(path)}`);
  }, [user, router, path]);
  if (!user) return null;
  return <>{children}</>;
}
