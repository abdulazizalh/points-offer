"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info } from "lucide-react";
import { useBiz, Kpi } from "@/components/biz/BizShell";
import { Card, Segmented } from "@/components/ui";
import { useStore } from "@/lib/store";
import { branchHistory, type DailyStat } from "@/lib/intelligence";
import { todayStats } from "@/lib/analytics";
import { kuwaitDate, kuwaitParts } from "@/lib/utils";

// Palette validated with the dataviz validator (light surface): single series uses brand medium;
// two-series chart uses #2F6DB5 / #C9824A (CVD ΔE ≥ 21).
const C1 = "#4D79A8";
const S1 = "#2F6DB5";
const S2 = "#C9824A";
const GRID = "#E1EAF3";
const AXIS = { fontSize: 11, fill: "#6B7F95" };

function ChartCard({ title, children, rows, cols }: { title: string; children: React.ReactNode; rows: Array<Array<string | number>>; cols: string[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-navy">{title}</h2>
      <div className="h-60" dir="ltr">{children}</div>
      <details className="mt-3 text-[12px] text-muted">
        <summary className="cursor-pointer select-none text-medium">Table</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="w-full text-[12px]">
            <thead><tr>{cols.map((c) => <th key={c} className="py-1 text-start font-semibold text-navy">{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, j) => <td key={j} className="ltr-nums py-1">{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #E1EAF3", boxShadow: "0 6px 20px rgba(34,58,94,.08)", fontSize: 12 };

export default function Analytics() {
  const biz = useBiz()!;
  const { t, db, locale } = useStore();
  const [range, setRange] = useState<"7" | "30">("7");
  const hist = branchHistory(db, biz.branch.id);
  const today = todayStats(db, [biz.branch.id]);

  const daily: DailyStat[] = useMemo(() => {
    const todayRow: DailyStat = { date: kuwaitDate(), volume: today.customers, avgWait: today.avgWait, avgService: today.avgService, cancelled: today.cancelled, noShow: Math.round((today.noShowRate / 100) * today.customers), satisfaction: today.rating };
    return [...hist.daily, todayRow].slice(-Number(range));
  }, [hist.daily, today, range]);

  const fmt = (d: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-GB", { day: "numeric", month: "short", numberingSystem: "latn" }).format(new Date(d + "T12:00:00Z"));
  const rows = daily.map((d) => ({ ...d, label: fmt(d.date), cancelRate: d.volume ? Math.round((d.cancelled / d.volume) * 1000) / 10 : 0, noShowRate: d.volume ? Math.round((d.noShow / d.volume) * 1000) / 10 : 0 }));
  const peak = hist.byWeekdayHour[kuwaitParts().day].map((v, h) => ({ hour: `${String(h).padStart(2, "0")}`, value: v })).filter((x) => x.value > 0);
  const week = hist.daily.slice(-7).reduce((a, d) => a + d.volume, 0) + today.customers;
  const month = hist.daily.reduce((a, d) => a + d.volume, 0) + today.customers;
  const avg = (k: keyof DailyStat) => (hist.daily.length ? Math.round((hist.daily.reduce((a, d) => a + Number(d[k]), 0) / hist.daily.length) * 10) / 10 : 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={range} onChange={setRange} options={[{ value: "7", label: t("biz.range.7") }, { value: "30", label: t("biz.range.30") }]} />
        {hist.isDemo && <p className="flex items-center gap-1.5 text-[12px] text-[#8a5b12]"><Info className="h-3.5 w-3.5" />{t("biz.analyticsDemo")}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("biz.week")} value={week} sub={t("biz.kpi.customers")} />
        <Kpi label={t("biz.month")} value={month} sub={t("biz.kpi.customers")} />
        <Kpi label={t("biz.kpi.avgWait")} value={<>{avg("avgWait")}<span className="text-[14px] text-muted"> {t("common.min")}</span></>} />
        <Kpi label={t("biz.kpi.avgService")} value={<>{avg("avgService")}<span className="text-[14px] text-muted"> {t("common.min")}</span></>} />
      </div>
      {hist.daily.length === 0 ? (
        <Card className="p-8 text-center text-[14px] text-muted">{t("biz.noHistory")}</Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard title={t("biz.chart.volume")} cols={["date", "volume"]} rows={rows.map((r) => [r.label, r.volume])}>
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(208,225,242,.4)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="volume" name={t("biz.kpi.customers")} fill={C1} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("biz.chart.peak")} cols={["hour", "avg arrivals"]} rows={peak.map((p) => [`${p.hour}:00`, p.value])}>
            <ResponsiveContainer>
              <BarChart data={peak} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(208,225,242,.4)" }} contentStyle={tooltipStyle} labelFormatter={(h) => `${h}:00`} />
                <Bar dataKey="value" name={t("biz.kpi.customers")} fill={C1} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("biz.chart.wait")} cols={["date", "avg wait", "avg service"]} rows={rows.map((r) => [r.label, r.avgWait, r.avgService])}>
            <ResponsiveContainer>
              <LineChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="avgWait" name={t("biz.kpi.avgWait")} stroke={S1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="avgService" name={t("biz.kpi.avgService")} stroke={S2} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("biz.chart.rates")} cols={["date", "cancel %", "no-show %"]} rows={rows.map((r) => [r.label, r.cancelRate, r.noShowRate])}>
            <ResponsiveContainer>
              <LineChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cancelRate" name={t("history.cancelled")} stroke={S1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="noShowRate" name={t("status.NO_SHOW")} stroke={S2} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={t("biz.chart.satisfaction")} cols={["date", "rating"]} rows={rows.map((r) => [r.label, r.satisfaction])}>
            <ResponsiveContainer>
              <LineChart data={rows.filter((r) => r.satisfaction > 0)} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[3, 5]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="satisfaction" name={t("biz.kpi.rating")} stroke={C1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
