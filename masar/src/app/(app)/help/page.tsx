"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Mail, MessageCircleQuestion } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Help() {
  const { t } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("help.title")} />
      <div className="space-y-5 px-5">
        <Link href="/help/contact" className="flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-navy to-deep p-4 text-white shadow-card">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Mail className="h-5 w-5" /></span>
          <span><span className="block text-[15px] font-semibold">{t("help.contact")}</span><span className="block text-[12.5px] text-light">{t("help.contactSub")}</span></span>
        </Link>
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-navy"><MessageCircleQuestion className="h-4.5 w-4.5 text-medium" />{t("help.faq")}</h2>
          <Card className="divide-y divide-line">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-3 p-4 text-start text-[14px] font-medium text-navy">
                  {t(`faq.${i}.q`)}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open === i && "rotate-180")} />
                </button>
                {open === i && <p className="animate-fade-in px-4 pb-4 text-[13.5px] leading-relaxed text-muted">{t(`faq.${i}.a`)}</p>}
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
