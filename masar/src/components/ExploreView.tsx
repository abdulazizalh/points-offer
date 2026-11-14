"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { List, Map as MapIcon, MapPin, SearchX, Search, X, ChevronDown } from "lucide-react";
import { Button, Chip, EmptyState, PageHeader, Segmented } from "@/components/ui";
import { CategoryIcon, MapView, PlaceCard } from "@/components/domain";
import { LocationSheet } from "@/components/LocationSheet";
import { useStore } from "@/lib/store";
import { origin, publicBranches, searchBranches, sortBranches, type SortKey } from "@/lib/selectors";
import { l } from "@/lib/utils";

export function ExploreView({ searchMode = false }: { searchMode?: boolean }) {
  const { t, db, session, locale } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState<string | null>(params.get("cat"));
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) || "nearest");
  const [openOnly, setOpenOnly] = useState(params.get("open") === "1");
  const [view, setView] = useState<"list" | "map">("list");
  const [locOpen, setLocOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchMode) inputRef.current?.focus();
  }, [searchMode]);

  // keep URL shareable
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("cat", cat);
    if (sort !== "nearest") sp.set("sort", sort);
    if (openOnly) sp.set("open", "1");
    const qs = sp.toString();
    router.replace(`${searchMode ? "/search" : "/explore"}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [q, cat, sort, openOnly, router, searchMode]);

  const from = origin(db, session);
  const all = useMemo(() => publicBranches(db, from), [db, from.lat, from.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => {
    let r = searchBranches(all, q);
    if (cat) r = r.filter((v) => v.category.id === cat);
    if (openOnly) r = r.filter((v) => v.open);
    return sortBranches(r, sort);
  }, [all, q, cat, openOnly, sort]);

  const clear = () => {
    setQ("");
    setCat(null);
    setOpenOnly(false);
    setSort("nearest");
  };
  const areaName = session.gps ? t("home.useGps") : l(db.areas.find((a) => a.id === session.areaId)?.name, locale);

  return (
    <div className="animate-fade-in">
      <PageHeader
        back={searchMode}
        title={searchMode ? undefined : t("explore.title")}
        right={!searchMode ? <Segmented value={view} onChange={setView} options={[{ value: "list", label: <List className="h-4 w-4" aria-label={t("explore.list")} /> }, { value: "map", label: <MapIcon className="h-4 w-4" aria-label={t("explore.map")} /> }]} /> : undefined}
      />
      <div className="space-y-3 px-5 pb-3">
        <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 shadow-soft focus-within:border-accent focus-within:ring-4 focus-within:ring-pale/60">
          <Search className="h-[18px] w-[18px] shrink-0 text-medium" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("home.search")}
            className="h-full flex-1 bg-transparent text-[14.5px] text-navy outline-none placeholder:text-muted/70"
            aria-label={t("common.search")}
            enterKeyHint="search"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear" className="grid h-6 w-6 place-items-center rounded-full bg-line text-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button onClick={() => setLocOpen(true)} className="inline-flex items-center gap-1 text-[12.5px] text-muted">
          <MapPin className="h-3.5 w-3.5 text-medium" /> <span className="font-medium text-navy">{areaName}</span> <ChevronDown className="h-3 w-3" />
        </button>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <Chip active={!cat} onClick={() => setCat(null)}>{t("common.all")}</Chip>
          {db.categories.filter((c) => c.active).sort((a, b) => a.sort - b.sort).map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)} icon={<CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />}>
              {l(c.name, locale)}
            </Chip>
          ))}
        </div>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {(["nearest", "lowest", "popular"] as SortKey[]).map((k) => (
            <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{t(`filter.${k}`)}</Chip>
          ))}
          <Chip active={openOnly} onClick={() => setOpenOnly(!openOnly)}>{t("filter.available")}</Chip>
        </div>
      </div>

      <p className="px-5 pb-2 text-[12px] font-medium text-muted">{t("explore.results", { n: results.length })}</p>

      {results.length === 0 ? (
        <EmptyState icon={<SearchX className="h-9 w-9" />} title={t("explore.noResults")} sub={t("explore.noResultsSub")} action={<Button variant="secondary" onClick={clear}>{t("explore.clear")}</Button>} />
      ) : view === "map" && !searchMode ? (
        <div className="px-5 pb-6">
          <MapView
            className="h-[460px]"
            you={from}
            pins={results.map((v) => ({ id: v.branch.id, lat: v.branch.lat, lng: v.branch.lng, label: l(v.business.name, locale), hue: v.business.hue, href: `/place/${v.branch.id}`, sub: v.slotted || !v.open ? v.business.initials : String(v.waiting) }))}
          />
          <div className="mt-4 space-y-3">
            {results.slice(0, 3).map((v) => <PlaceCard key={v.branch.id} v={v} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-5 pb-6">
          {results.map((v) => <PlaceCard key={v.branch.id} v={v} />)}
        </div>
      )}
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}
