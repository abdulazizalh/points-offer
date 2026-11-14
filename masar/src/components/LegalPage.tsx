"use client";
import { PageHeader } from "./ui";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export function LegalPage({ title, sections }: { title: string; sections: Array<{ h: [string, string]; p: [string, string] }> }) {
  const { t, locale } = useStore();
  const i = locale === "ar" ? 1 : 0;
  return (
    <div className="bg-white min-h-full">
      <PageHeader title={title} />
      <article className="px-5 pb-12">
        <p className="mb-6 text-[12px] text-muted">{t("legal.updated", { d: formatDate(Date.UTC(2026, 10, 1), locale) })}</p>
        {sections.map((s, k) => (
          <section key={k} className="mb-6">
            <h2 className="mb-2 text-[16px] font-semibold text-navy">{k + 1}. {s.h[i]}</h2>
            <p className="text-[14px] leading-7 text-muted">{s.p[i]}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
