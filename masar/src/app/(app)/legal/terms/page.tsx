"use client";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal";
import { useStore } from "@/lib/store";
export default function Terms() {
  const { t } = useStore();
  return <LegalPage title={t("legal.terms")} sections={TERMS} />;
}
