"use client";
import { useCallback, useState } from "react";
import { Ban, Check, HeartPulse, Megaphone, MonitorUp, Pause, Play, QrCode, RotateCcw, ScanLine, SkipForward, UserPlus, UserX, CheckCheck } from "lucide-react";
import { useBiz } from "@/components/biz/BizShell";
import { Badge, Button, Card, ConfirmDialog, Field, Input, Select, Sheet } from "@/components/ui";
import { StatusBadge } from "@/components/domain";
import { QrScanner } from "@/components/QrScanner";
import { useStore } from "@/lib/store";
import { addWalkIn, branchLine, callNext, cancelTicket, completeService, confirmArrival, ensureSession, markNoShow, nowServing, prioritiseTicket, recallTicket, setSessionStatus, skipTicket, startService } from "@/lib/engine";
import { checkinCode, cn, formatTime, kuwaitDate, l, maskName } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

const parseTicket = (raw: string) => raw.match(/^masar:ticket:(.+)$/)?.[1] ?? null;

export default function QueueOps() {
  const biz = useBiz()!;
  const { t, db, locale, run, toast } = useStore();
  const [walkIn, setWalkIn] = useState(false);
  const [wiService, setWiService] = useState("");
  const [wiName, setWiName] = useState("");
  const [scan, setScan] = useState(false);
  const [scanCam, setScanCam] = useState(false);
  const [lookup, setLookup] = useState("");
  const [prio, setPrio] = useState<Ticket | null>(null);
  const [reason, setReason] = useState("");
  const [cancelT, setCancelT] = useState<Ticket | null>(null);
  const a = biz.actor;
  const branch = biz.branch;
  const session = db.sessions.find((s) => s.branchId === branch.id && s.date === kuwaitDate());
  const line = branchLine(db, branch.id);
  const serving = nowServing(db, branch.id);
  const services = db.services.filter((s) => s.branchIds.includes(branch.id) && s.active);
  const done = db.tickets.filter((x) => x.sessionId === session?.id && ["COMPLETED", "CANCELLED", "NO_SHOW", "SKIPPED"].includes(x.status)).sort((x, y) => (y.endedAt ?? y.calledAt ?? 0) - (x.endedAt ?? x.calledAt ?? 0));
  const svcName = (id: string) => l(db.services.find((s) => s.id === id)?.name, locale);
  const who = (tk: Ticket) => tk.guestLabel ?? maskName(db.users.find((u) => u.id === tk.userId)?.name ?? "—");
  const healthcare = services.some((s) => (s.queueType ?? branch.queueType) === "healthcare");

  const arriveById = useCallback(
    (id: string) => {
      const tk = db.tickets.find((x) => x.id === id && x.branchId === branch.id);
      if (!tk) return;
      run((d) => confirmArrival(d, a, tk.id, undefined), `${tk.number} · ${t("ticket.arrived")}`);
    },
    [db, branch.id, run, a, t],
  );

  return (
    <div className="space-y-5">
      {session?.status === "paused" && <div className="rounded-2xl bg-warning/15 p-3.5 text-[13px] font-medium text-[#8a5b12]">{t("biz.paused")}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" icon={<Megaphone className="h-5 w-5" />} onClick={() => {
          const r = run((d) => callNext(d, a, branch.id, { employeeId: biz.acting?.id }));
          if (r.ok && !r.data) toast(t("biz.emptyLine"));
          if (r.ok && r.data) toast(`${r.data.number} → ${t("ticket.counter", { c: r.data.counter ?? "1" })}`);
        }} disabled={line.length === 0}>{t("biz.callNext")}</Button>
        <Button size="lg" variant="outline" icon={<UserPlus className="h-5 w-5" />} onClick={() => { setWiService(services[0]?.id ?? ""); setWalkIn(true); }}>{t("biz.addWalkIn")}</Button>
        <Button size="lg" variant="outline" icon={<ScanLine className="h-5 w-5" />} onClick={() => setScan(true)}>{t("biz.scanTicket")}</Button>
        <Button size="lg" variant="ghost" icon={session?.status === "paused" ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />} onClick={() => run((d) => { ensureSession(d, branch.id); return setSessionStatus(d, a, branch.id, session?.status === "paused" ? "open" : "paused"); })}>
          {session?.status === "paused" ? t("biz.resume") : t("biz.pause")}
        </Button>
        <a href={`/display/${branch.id}`} target="_blank" rel="noopener" className="ms-auto inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-white px-4 text-[13px] font-semibold text-navy hover:bg-bg"><MonitorUp className="h-4 w-4" />{t("biz.openDisplay")}</a>
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-light bg-white px-4 py-2" title={t("biz.br.checkinSub")}>
          <QrCode className="h-4 w-4 text-medium" />
          <span className="text-[11px] text-muted">{t("biz.br.checkin")}</span>
          <span className="font-mono text-[15px] font-bold tracking-[0.25em] text-navy">{checkinCode(branch.checkinSecret)}</span>
        </div>
      </div>
      {biz.acting && <p className="text-[12.5px] text-muted">{t("biz.actingAs")}: <b className="text-navy">{biz.acting.name}</b> · {t("ticket.counter", { c: biz.acting.counter })}{biz.acting.clinical && <Badge tone="error" className="ms-2"><HeartPulse className="h-3 w-3" />{t("biz.emp.clinical").split("(")[0]}</Badge>}</p>}

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("biz.serving")} · <span className="ltr-nums">{serving.length}</span></h2>
        {serving.length === 0 ? <Card className="p-5 text-[13px] text-muted">{t("biz.emptyServing")}</Card> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {serving.map((tk) => (
              <Card key={tk.id} className={cn("p-4", tk.status === "IN_SERVICE" ? "border-medium/40" : "border-success/40 ring-2 ring-success/15")}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="ltr-nums text-[28px] font-bold leading-none text-navy">{tk.number}</p>
                    <p className="mt-1 text-[12.5px] text-muted">{who(tk)} · {svcName(tk.serviceId)}</p>
                  </div>
                  <div className="text-end">
                    <StatusBadge status={tk.status} />
                    <p className="mt-1 text-[11.5px] text-muted">{t("ticket.counter", { c: tk.counter ?? "1" })}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 text-[11.5px]">
                  <Badge tone={tk.arrivedAt ? "success" : "warning"}>{tk.arrivedAt ? t("biz.arrived") : t("biz.notArrived")}</Badge>
                  {tk.calledAt && <span className="text-muted">{formatTime(tk.calledAt, locale)}</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tk.status === "CALLED" && <Button size="sm" icon={<Play className="h-4 w-4" />} onClick={() => run((d) => startService(d, a, tk.id))}>{t("biz.start")}</Button>}
                  <Button size="sm" variant="success" icon={<Check className="h-4 w-4" />} onClick={() => run((d) => completeService(d, a, tk.id), `${tk.number} ✓`)}>{t("biz.complete")}</Button>
                  {tk.status === "CALLED" && <Button size="sm" variant="outline" icon={<SkipForward className="h-4 w-4" />} onClick={() => run((d) => skipTicket(d, a, tk.id))}>{t("biz.skip")}</Button>}
                  {tk.status === "CALLED" && <Button size="sm" variant="ghost" icon={<UserX className="h-4 w-4" />} onClick={() => run((d) => markNoShow(d, a, tk.id))}>{t("biz.noShow")}</Button>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("biz.inLine")} · <span className="ltr-nums">{line.length}</span></h2>
        <Card className="overflow-x-auto">
          {line.length === 0 ? <p className="p-5 text-[13px] text-muted">{t("biz.emptyLine")}</p> : (
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="border-b border-line bg-bg/60 text-start text-[11.5px] uppercase tracking-wide text-muted">
                <tr>{["biz.col.pos", "biz.col.ticket", "biz.col.customer", "biz.col.service", "biz.col.booked", "biz.col.arrival", "biz.col.status", "common.actions"].map((k) => <th key={k} className="px-4 py-3 text-start font-semibold">{t(k)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {line.map((tk, i) => (
                  <tr key={tk.id} className={cn("hover:bg-bg/50", tk.priority && "bg-error/5")}>
                    <td className="ltr-nums px-4 py-3 text-muted">{i + 1}</td>
                    <td className="px-4 py-3"><span className="ltr-nums font-bold text-navy">{tk.number}</span>{tk.priority && <HeartPulse className="ms-1 inline h-3.5 w-3.5 text-error" aria-label={t("ticket.priority")} />}{tk.postponed && <Badge tone="muted" className="ms-1">↺</Badge>}</td>
                    <td className="px-4 py-3 text-navy">{who(tk)} <span className="text-[11px] text-muted">· {tk.channel === "walk_in" ? t("qt.walk_in") : tk.channel === "onsite_qr" ? "QR" : t("book.remote")}</span></td>
                    <td className="px-4 py-3 text-muted">{svcName(tk.serviceId)}</td>
                    <td className="ltr-nums px-4 py-3 text-muted">{tk.slotStart ? formatTime(tk.slotStart, locale) : formatTime(tk.createdAt, locale)}</td>
                    <td className="px-4 py-3"><Badge tone={tk.arrivedAt ? "success" : "muted"}>{tk.arrivedAt ? t("biz.arrived") : t("biz.notArrived")}</Badge></td>
                    <td className="px-4 py-3"><StatusBadge status={tk.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {!tk.arrivedAt && <Button size="sm" variant="secondary" onClick={() => run((d) => confirmArrival(d, a, tk.id, undefined))}>{t("biz.confirmArrival")}</Button>}
                        <Button size="sm" variant="outline" onClick={() => run((d) => startService(d, a, tk.id))} disabled={!tk.arrivedAt}>{t("biz.start")}</Button>
                        {tk.queueType === "healthcare" && !tk.priority && <Button size="sm" variant="ghost" className="!text-error" icon={<HeartPulse className="h-3.5 w-3.5" />} onClick={() => { setPrio(tk); setReason(""); }}>{t("biz.prioritise")}</Button>}
                        <Button size="sm" variant="ghost" aria-label={t("biz.skip")} onClick={() => run((d) => skipTicket(d, a, tk.id))}><SkipForward className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" aria-label={t("biz.cancelTicket")} className="!text-error" onClick={() => setCancelT(tk)}><Ban className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        {healthcare && <p className="mt-2 text-[12px] text-muted">{t("biz.prioritiseOnly")}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("biz.done")} · <span className="ltr-nums">{done.length}</span></h2>
        <Card className="divide-y divide-line">
          {done.slice(0, 12).map((tk) => (
            <div key={tk.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span className="ltr-nums w-16 font-semibold text-navy">{tk.number}</span>
              <span className="flex-1 truncate text-muted">{who(tk)} · {svcName(tk.serviceId)}</span>
              <StatusBadge status={tk.status} />
              {tk.status === "SKIPPED" && <Button size="sm" variant="outline" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => run((d) => recallTicket(d, a, tk.id))}>{t("biz.recall")}</Button>}
              {tk.status === "SKIPPED" && <Button size="sm" variant="ghost" onClick={() => run((d) => markNoShow(d, a, tk.id))}>{t("biz.noShow")}</Button>}
            </div>
          ))}
          {done.length === 0 && <p className="p-4 text-[13px] text-muted">—</p>}
        </Card>
      </section>

      <Sheet open={walkIn} onClose={() => setWalkIn(false)} title={t("biz.addWalkIn")}>
        <div className="space-y-4">
          <Field label={t("biz.col.service")} htmlFor="wis"><Select id="wis" value={wiService} onChange={(e) => setWiService(e.target.value)}>{services.map((s) => <option key={s.id} value={s.id}>{l(s.name, locale)}</option>)}</Select></Field>
          <Field label={t("biz.walkInName")} htmlFor="win"><Input id="win" value={wiName} onChange={(e) => setWiName(e.target.value)} maxLength={40} /></Field>
          <Button full size="lg" disabled={!wiService} onClick={() => { const r = run((d) => addWalkIn(d, a, branch.id, wiService, wiName)); if (r.ok) { toast(`${r.data.number} ✓`); setWalkIn(false); setWiName(""); } }}>{t("common.add")}</Button>
        </div>
      </Sheet>

      <Sheet open={scan} onClose={() => setScan(false)} title={t("biz.scanTicket")}>
        <div className="space-y-3">
          <Button variant="secondary" full size="lg" icon={<ScanLine className="h-5 w-5" />} onClick={() => setScanCam(true)}>{t("arrive.scan")}</Button>
          <Field label={t("biz.col.ticket")} htmlFor="lk"><Input id="lk" dir="ltr" placeholder="A-012" value={lookup} onChange={(e) => setLookup(e.target.value.toUpperCase())} /></Field>
          <Button full disabled={!lookup} icon={<CheckCheck className="h-4 w-4" />} onClick={() => { const tk = line.concat(serving).find((x) => x.number === lookup.trim()); if (tk) { arriveById(tk.id); setScan(false); setLookup(""); } else toast(t("err.not_found"), "error"); }}>{t("biz.confirmArrival")}</Button>
        </div>
      </Sheet>
      <QrScanner open={scanCam} onClose={() => setScanCam(false)} parse={parseTicket} title={t("biz.scanTicket")} onCode={(id) => { setScanCam(false); setScan(false); arriveById(id); }} />

      <Sheet open={!!prio} onClose={() => setPrio(null)} title={`${t("biz.prioritise")} · ${prio?.number ?? ""}`}>
        <div className="space-y-4">
          <p className="text-[13px] text-muted">{t("biz.prioritiseOnly")}</p>
          {!biz.acting?.clinical && <p className="rounded-2xl bg-error/10 p-3 text-[13px] text-error">{t("err.forbidden")} — {t("biz.actingAs")}</p>}
          <Field label={t("biz.prioritiseReason")} htmlFor="pr"><Input id="pr" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} /></Field>
          <Button full size="lg" variant="danger" disabled={!reason.trim() || !biz.acting?.clinical} onClick={() => { const r = run((d) => prioritiseTicket(d, a, prio!.id, reason)); if (r.ok) setPrio(null); }}>{t("common.confirm")}</Button>
        </div>
      </Sheet>
      <ConfirmDialog open={!!cancelT} onClose={() => setCancelT(null)} danger title={t("biz.cancelTicket")} body={cancelT?.number} confirmLabel={t("biz.cancelTicket")} icon={<Ban className="h-7 w-7" />} onConfirm={() => { run((d) => cancelTicket(d, a, cancelT!.id)); setCancelT(null); }} />
    </div>
  );
}
