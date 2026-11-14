"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, MessageSquareOff } from "lucide-react";
import { BizLogo, Button, Card, EmptyState, Field, PageHeader, StarInput, Textarea } from "@/components/ui";
import { RequireUser } from "@/components/AppFrame";
import { useStore } from "@/lib/store";
import { submitReview } from "@/lib/engine";
import { l } from "@/lib/utils";

export default function ReviewPage() {
  return <RequireUser><ReviewInner /></RequireUser>;
}

function ReviewInner() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t, db, locale, run, actor, session } = useStore();
  const router = useRouter();
  const tk = db.tickets.find((x) => x.id === ticketId);
  const [rating, setRating] = useState(0);
  const [wait, setWait] = useState(0);
  const [service, setService] = useState(0);
  const [text, setText] = useState("");
  if (!tk || tk.userId !== session.userId || tk.status !== "COMPLETED" || tk.reviewed)
    return (
      <div>
        <PageHeader title={t("review.title")} />
        <EmptyState icon={<MessageSquareOff className="h-9 w-9" />} title={tk?.reviewed ? t("ticket.rated") : t("review.notAllowed")} action={<Button href="/history">{t("history.title")}</Button>} />
      </div>
    );
  const b = db.businesses.find((x) => x.id === tk.businessId)!;
  const s = db.services.find((x) => x.id === tk.serviceId);
  const submit = () => {
    const r = run((d) => submitReview(d, actor, { ticketId: tk.id, rating, waitRating: wait || rating, serviceRating: service || rating, text }), t("review.thanks"));
    if (r.ok) router.replace(`/queue/${tk.id}`);
  };
  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("review.title")} />
      <div className="space-y-4 px-5">
        <Card className="flex items-center gap-3 p-4">
          <BizLogo initials={b.initials} hue={b.hue} size={48} />
          <div>
            <p className="text-[15px] font-semibold text-navy">{l(b.name, locale)}</p>
            <p className="text-[12.5px] text-muted"><span className="ltr-nums">{tk.number}</span> · {l(s?.name, locale)}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-success"><BadgeCheck className="h-3.5 w-3.5" />{t("review.verified")}</p>
          </div>
        </Card>
        <Card className="space-y-5 p-5">
          <div className="text-center">
            <p className="mb-2 text-[15px] font-semibold text-navy">{t("review.overall")}</p>
            <div className="flex justify-center"><StarInput value={rating} onChange={setRating} label={t("review.overall")} /></div>
          </div>
          <div className="grid gap-4 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-3"><span className="text-[13.5px] text-navy">{t("review.wait")}</span><div className="scale-75 origin-right rtl:origin-left"><StarInput value={wait} onChange={setWait} label={t("review.wait")} /></div></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[13.5px] text-navy">{t("review.service")}</span><div className="scale-75 origin-right rtl:origin-left"><StarInput value={service} onChange={setService} label={t("review.service")} /></div></div>
          </div>
        </Card>
        <Field label={`${t("review.text")} (${t("common.optional")})`} htmlFor="rtext">
          <Textarea id="rtext" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("review.placeholder")} />
        </Field>
        <Button size="lg" full disabled={!rating} onClick={submit}>{t("review.submit")}</Button>
      </div>
    </div>
  );
}
