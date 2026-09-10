"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { LIMITS } from "@/lib/data/portfolio"
import { CHART, PORTFOLIO_COLORS, SLEEVE_COLORS } from "@/lib/colors"
import { fmtNum, fmtPct } from "@/lib/format"
import { PORTFOLIO_LABELS, type Metrics, type PortfolioKey } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { ChartFrame, ChartTip, HBars } from "@/components/dashboard/charts"
import { Delta, PageHeader, Panel, Provenance, TableWrap, Td, Th } from "@/components/dashboard/ui"

const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]

export default function ConcentrationPage() {
  const { model, openFund } = useDashboard()
  const cur = model.current
  const pro = model.proposed

  const measures: { label: string; get: (m: Metrics) => number; fmt: (v: number) => string; goodWhen: "up" | "down" }[] = [
    { label: "Largest holding", get: (m) => m.largest?.weight ?? 0, fmt: (v) => fmtPct(v), goodWhen: "down" },
    { label: "Top 3", get: (m) => m.top3, fmt: (v) => fmtPct(v), goodWhen: "down" },
    { label: "Top 5", get: (m) => m.top5, fmt: (v) => fmtPct(v), goodWhen: "down" },
    { label: "HHI (0–10,000)", get: (m) => m.hhi, fmt: (v) => Math.round(v).toLocaleString("en-IN"), goodWhen: "down" },
    { label: "Effective number of holdings (1 / Σw²)", get: (m) => m.effectiveN, fmt: (v) => fmtNum(v, 2), goodWhen: "up" },
    { label: "Meaningful holdings (≥ 2%)", get: (m) => m.meaningful, fmt: (v) => String(v), goodWhen: "up" },
  ]

  const maxN = Math.max(...KEYS.map((k) => model.byKey[k].sorted.length))
  const curve = Array.from({ length: maxN + 1 }, (_, i) => {
    const row: Record<string, number | null> = { rank: i }
    for (const k of KEYS) {
      const s = model.byKey[k].sorted
      row[k] = i <= s.length ? s.slice(0, i).reduce((acc, p) => acc + p.weight, 0) * 100 : null
    }
    return row
  })

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Concentration"
        title="Concentration explorer"
        description="Measures update live with the builder. Owning more funds does not automatically mean more diversification — two overlapping funds are one exposure held twice."
      />

      <Panel title="Concentration measures" description="Current vs proposed vs compliance fallback">
        <TableWrap>
          <thead>
            <tr>
              <Th>Measure</Th>
              {KEYS.map((k) => (
                <Th key={k} align="right">
                  {PORTFOLIO_LABELS[k]}
                </Th>
              ))}
              <Th align="right">Change (proposed)</Th>
            </tr>
          </thead>
          <tbody>
            {measures.map((r) => (
              <tr key={r.label}>
                <Td className="text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    {r.label} <Provenance kind="calculated" />
                  </span>
                </Td>
                {KEYS.map((k) => (
                  <Td key={k} align="right" className={k === "proposed" ? "font-semibold text-slate-900" : undefined}>
                    {r.fmt(r.get(model.byKey[k]))}
                  </Td>
                ))}
                <Td align="right">
                  <Delta
                    value={r.get(pro) - r.get(cur)}
                    goodWhen={r.goodWhen}
                    display={
                      r.label.startsWith("HHI") || r.label.startsWith("Meaningful") || r.label.startsWith("Effective")
                        ? `${r.get(pro) - r.get(cur) > 0 ? "+" : "−"}${r.fmt(Math.abs(r.get(pro) - r.get(cur)))}`
                        : `${(r.get(pro) - r.get(cur)) * 100 > 0 ? "+" : "−"}${Math.abs((r.get(pro) - r.get(cur)) * 100).toFixed(1)}pp`
                    }
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="mt-3 text-xs text-slate-500">
          Reconciliation R3: the PDF prints a 65% proposed top-5, which equals the five largest <em>equity</em> holdings; across
          all holdings the printed weights give {fmtPct(model.recommended.top5, 0)} — within 1 pp of the §20 “top-5 &gt;{" "}
          {LIMITS.top5Trigger}% → trim” trigger.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Concentration curve"
          description="Cumulative weight held by the largest n holdings. The flatter the curve, the more diversified."
          actions={
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              {KEYS.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded" style={{ background: PORTFOLIO_COLORS[k] }} /> {PORTFOLIO_LABELS[k]}
                </span>
              ))}
            </div>
          }
        >
          <ChartFrame
            chart={
              <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 520, height: 260 }}>
                <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="rank" tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTip valueFormatter={(v) => `${v.toFixed(1)}%`} labelFormatter={(l) => `Top ${String(l)} holdings`} />} />
                  <ReferenceLine y={LIMITS.top5Trigger} stroke="#fab219" />
                  {KEYS.map((k) => (
                    <Line
                      key={k}
                      type="linear"
                      dataKey={k}
                      name={PORTFOLIO_LABELS[k]}
                      stroke={PORTFOLIO_COLORS[k]}
                      strokeWidth={2}
                      dot={{ r: 4, stroke: "#fff", strokeWidth: 2, fill: PORTFOLIO_COLORS[k] }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            }
            table={
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Top n</Th>
                    {KEYS.map((k) => (
                      <Th key={k} align="right">
                        {PORTFOLIO_LABELS[k]}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {curve.slice(1).map((r) => (
                    <tr key={String(r.rank)}>
                      <Td>{String(r.rank)}</Td>
                      {KEYS.map((k) => (
                        <Td key={k} align="right">
                          {r[k] === null ? "—" : `${(r[k] as number).toFixed(1)}%`}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            }
          />
          <p className="mt-1 text-[11px] text-slate-500">Amber line: {LIMITS.top5Trigger}% top-5 trigger (§20).</p>
        </Panel>

        <Panel title="Proposed — position sizes" description={`Against the ${LIMITS.maxPosition}% hard maximum per fund (§21)`}>
          <HBars
            rows={pro.sorted.map((p) => ({
              key: p.key,
              label: p.fund.shortName,
              value: p.weight,
              display: fmtPct(p.weight, 1),
              color: SLEEVE_COLORS[p.fund.sleeve],
              onClick: () => openFund(p.fund.id),
            }))}
            max={0.25}
            refLines={[{ value: LIMITS.maxPosition / 100, label: `${LIMITS.maxPosition}% max`, tone: "red" }]}
          />
        </Panel>
      </div>

      <Panel title="Manager (AMC) concentration — proposed" description={`No single AMC above ~${LIMITS.amcGuideline}% without a recorded rationale (§21)`}>
        <HBars
          rows={pro.amc.map((a) => ({
            key: a.amc,
            label: a.amc,
            value: a.weight,
            display: fmtPct(a.weight, 1),
            color: a.weight > LIMITS.amcGuideline / 100 ? "#ec835a" : "#2a78d6",
          }))}
          max={0.4}
          labelWidth="w-56"
          refLines={[{ value: LIMITS.amcGuideline / 100, label: `~${LIMITS.amcGuideline}% AMC guideline` }]}
        />
        {pro.amc[0] && pro.amc[0].weight > LIMITS.amcGuideline / 100 && (
          <p className="mt-2 text-xs text-amber-800">
            {pro.amc[0].amc} at {fmtPct(pro.amc[0].weight, 0)} exceeds the guideline — record a rationale (trustee decision
            list) or rebalance.
          </p>
        )}
      </Panel>
    </>
  )
}
