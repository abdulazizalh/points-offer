"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, PageHeader, Select, Textarea } from "@/components/ui";
import { useStore, store } from "@/lib/store";
import { uid } from "@/lib/utils";

export default function Contact() {
  const { t, user, toast, db, locale } = useStore();
  const router = useRouter();
  const [topic, setTopic] = useState("booking");
  const [biz, setBiz] = useState("");
  const [text, setText] = useState("");
  const submit = () => {
    store.mutate((d) => {
      d.support.push({ id: uid("sup"), userId: user?.id ?? "guest", topic, text: text.trim().slice(0, 2000), at: Date.now() });
      if (topic === "business" && biz) d.reports.push({ id: uid("rep"), kind: "complaint", businessId: biz, userId: user?.id ?? "guest", text: text.trim().slice(0, 2000), status: "open", at: Date.now() });
      return { ok: true, data: undefined };
    });
    toast(t("help.sent"));
    router.back();
  };
  return (
    <div className="animate-fade-in pb-10">
      <PageHeader title={t("help.contact")} sub={t("help.contactSub")} />
      <div className="space-y-4 px-5">
        <Field label={t("help.topic")} htmlFor="tp">
          <Select id="tp" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {["booking", "account", "business", "other"].map((k) => <option key={k} value={k}>{t(`help.topic.${k}`)}</option>)}
          </Select>
        </Field>
        {topic === "business" && (
          <Field label={t("help.report")} htmlFor="bz">
            <Select id="bz" value={biz} onChange={(e) => setBiz(e.target.value)}>
              <option value="">—</option>
              {db.businesses.filter((b) => b.verification === "verified").map((b) => <option key={b.id} value={b.id}>{b.name[locale]}</option>)}
            </Select>
          </Field>
        )}
        <Field label={t("help.message")} htmlFor="msg"><Textarea id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} /></Field>
        <Button size="lg" full disabled={text.trim().length < 5} onClick={submit}>{t("common.submit")}</Button>
      </div>
    </div>
  );
}
