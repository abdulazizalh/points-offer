"use client";
import { useState } from "react";
import { Check, LocateFixed, MapPin } from "lucide-react";
import { Sheet } from "./ui";
import { useStore } from "@/lib/store";
import { cn, l } from "@/lib/utils";

export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, db, session, setSession, locale, toast, user } = useStore();
  const [locating, setLocating] = useState(false);
  const useGps = () => {
    if (!("geolocation" in navigator)) return toast(t("home.gpsUnavailable"), "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setSession({ gps: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        onClose();
      },
      () => {
        setLocating(false);
        toast(t("home.gpsDenied"), "error");
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("home.chooseArea")}>
      <button onClick={useGps} className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-pale/50 p-3.5 text-start text-[14px] font-semibold text-deep">
        <LocateFixed className={cn("h-5 w-5", locating && "animate-pulse")} /> {t("home.useGps")}
        {session.gps && <Check className="ms-auto h-4 w-4" />}
      </button>
      {user && user.savedLocations.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {user.savedLocations.map((s) => (
            <button key={s.id} onClick={() => { setSession({ areaId: s.areaId, gps: undefined }); onClose(); }} className="rounded-full border border-line px-3 py-1.5 text-[13px] text-navy">
              {s.label}
            </button>
          ))}
        </div>
      )}
      <ul className="divide-y divide-line">
        {db.areas.map((a) => {
          const on = !session.gps && session.areaId === a.id;
          return (
            <li key={a.id}>
              <button onClick={() => { setSession({ areaId: a.id, gps: undefined }); onClose(); }} className="flex w-full items-center gap-3 py-3.5 text-start">
                <MapPin className={cn("h-4.5 w-4.5", on ? "text-navy" : "text-muted")} />
                <span className="flex-1">
                  <span className="block text-[14.5px] font-medium text-navy">{l(a.name, locale)}</span>
                  <span className="block text-[12px] text-muted">{l(a.governorate, locale)}</span>
                </span>
                {on && <Check className="h-4 w-4 text-navy" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
