"use client";
import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { useStore } from "@/lib/store";
import { checkinCode } from "@/lib/utils";
import { DATA_MODE } from "@/lib/config";

/** Demo only: reveals the code that the in-branch screen would show, so testers can complete the journey. */
export function DemoCodeHint({ branchId, onUse }: { branchId: string; onUse: (code: string) => void }) {
  const { db, t } = useStore();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const branch = db.branches.find((b) => b.id === branchId);
  if (DATA_MODE !== "demo" || !branch) return null;
  const code = checkinCode(branch.checkinSecret);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-[#fdf6ea] p-3 text-[12.5px] text-[#8a5b12]">
      <Lightbulb className="h-4 w-4 shrink-0" />
      <span className="flex-1">{t("demo.codeHint")} <b className="font-mono tracking-[0.2em]" dir="ltr">{code}</b></span>
      <button type="button" onClick={() => onUse(code)} className="rounded-xl bg-white px-3 py-1.5 font-semibold text-navy shadow-soft">{t("demo.useCode")}</button>
    </div>
  );
}
