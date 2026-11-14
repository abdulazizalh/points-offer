"use client";
import { WifiOff } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
export default function Offline() {
  const { t } = useStore();
  return (
    <div className="pt-20">
      <EmptyState icon={<WifiOff className="h-9 w-9" />} title={t("state.offline")} sub={t("state.offlineSub")} action={<Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>} />
    </div>
  );
}
