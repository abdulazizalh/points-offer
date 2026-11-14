"use client";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal";
import { useStore } from "@/lib/store";
export default function Privacy() {
  const { t } = useStore();
  return <LegalPage title={t("legal.privacy")} sections={PRIVACY} />;
}
