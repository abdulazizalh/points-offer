"use client";
import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Field, IconButton, Input, PageHeader, Select, Sheet } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { useStore, store } from "@/lib/store";
import { l, uid } from "@/lib/utils";
import type { SavedLocation } from "@/lib/types";

export default function Locations() {
  return <RequireUser><LocInner /></RequireUser>;
}

function LocInner() {
  const { t, user, db, locale, setSession } = useStore();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [area, setArea] = useState(db.areas[0].id);
  const update = (fn: (list: SavedLocation[]) => SavedLocation[]) =>
    store.mutate((d) => {
      const u = d.users.find((x) => x.id === user!.id);
      if (u) u.savedLocations = fn(u.savedLocations);
      return { ok: true, data: undefined };
    });
  if (!user) return null;
  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("profile.locations")} right={<IconButton label={t("loc.add")} onClick={() => setOpen(true)}><Plus className="h-5 w-5" /></IconButton>} />
      {user.savedLocations.length === 0 ? (
        <EmptyState icon={<MapPin className="h-9 w-9" />} title={t("loc.empty")} action={<Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>{t("loc.add")}</Button>} />
      ) : (
        <Card className="mx-5 divide-y divide-line">
          {user.savedLocations.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <button className="flex flex-1 items-center gap-3 text-start" onClick={() => setSession({ areaId: s.areaId, gps: undefined })}>
                <MapPin className="h-5 w-5 text-medium" />
                <span><span className="block text-[14.5px] font-medium text-navy">{s.label}</span><span className="text-[12px] text-muted">{l(db.areas.find((a) => a.id === s.areaId)?.name, locale)}</span></span>
              </button>
              <IconButton label={t("common.delete")} onClick={() => update((list) => list.filter((x) => x.id !== s.id))}><Trash2 className="h-4 w-4 text-error" /></IconButton>
            </div>
          ))}
        </Card>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("loc.add")}>
        <div className="space-y-4">
          <Field label={t("loc.label")} htmlFor="ll"><Input id="ll" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} /></Field>
          <Field label={t("loc.area")} htmlFor="la"><Select id="la" value={area} onChange={(e) => setArea(e.target.value)}>{db.areas.map((a) => <option key={a.id} value={a.id}>{l(a.name, locale)}</option>)}</Select></Field>
          <Button full size="lg" disabled={!label.trim()} onClick={() => { update((list) => [...list, { id: uid("loc"), label: label.trim(), areaId: area }]); setOpen(false); setLabel(""); }}>{t("common.save")}</Button>
        </div>
      </Sheet>
    </div>
  );
}
