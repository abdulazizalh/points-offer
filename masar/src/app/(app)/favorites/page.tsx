"use client";
import { Heart } from "lucide-react";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { PlaceCard } from "@/components/domain";
import { RequireUser } from "@/components/AppFrame";
import { useStore } from "@/lib/store";
import { branchView, origin } from "@/lib/selectors";

export default function Favorites() {
  const { t, db, session } = useStore();
  const from = origin(db, session);
  const favs = db.favorites
    .filter((f) => f.userId === session.userId && f.kind === "branch")
    .map((f) => db.branches.find((b) => b.id === f.refId))
    .filter(Boolean)
    .map((b) => branchView(db, b!, from))
    .filter((v) => v && v.business.verification === "verified");
  return (
    <RequireUser>
      <div className="animate-fade-in pb-8">
        <PageHeader title={t("fav.title")} />
        {favs.length === 0 ? (
          <EmptyState icon={<Heart className="h-9 w-9" />} title={t("fav.empty")} sub={t("fav.emptySub")} action={<Button href="/explore">{t("myq.find")}</Button>} />
        ) : (
          <div className="space-y-3 px-5">{favs.map((v) => <PlaceCard key={v!.branch.id} v={v!} />)}</div>
        )}
      </div>
    </RequireUser>
  );
}
