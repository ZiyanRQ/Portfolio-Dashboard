"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { AssumptionStatus } from "@/lib/data/legal"
import { PORTFOLIO_VALUE } from "@/lib/data/portfolio"
import { CHART, PORTFOLIO_COLORS, STATUS_COLORS } from "@/lib/colors"
import { fmtPct } from "@/lib/format"
import { compliance } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { CapacityGauge, ChartFrame, ChartTip } from "@/components/dashboard/charts"
import { Callout, Kpi, NumberField, PageHeader, Panel, RangeField, SelectField, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const CRORE = 10_000_000
const STATUSES: AssumptionStatus[] = ["Unconfirmed", "Confirmed", "Open item", "Adopted"]
const PDF_TABLE = [
  { x: 0, total: "5.29 cr", max: "2.38 cr", leave: "2.91 cr" },
  { x: 2e7, total: "7.29 cr", max: "3.28 cr", leave: "2.01 cr" },
  { x: 4e7, total: "9.29 cr", max: "4.18 cr", leave: "1.11 cr" },
  { x: 6.46e7, total: "11.75 cr", max: "5.29 cr", leave: "nil" },
]

export default function B17Page() {
  const { model, state, set, setRecord, money, canEditRecords } = useDashboard()
  const a = state.assumptions
  const x = state.b17
  const cur = model.compliance.current
  const pro = model.compliance.proposed
  const b17Status = state.assumptionReg.B17?.status ?? "Unconfirmed"
  const c619Pro = model.proposed.c619 * model.proposed.value
  const c619Cur = model.current.c619 * model.current.value

  const curve = Array.from({ length: 49 }, (_, i) => i * 0.25 * CRORE).map((v) => ({
    x: v / CRORE,
    current: (c619Cur / (PORTFOLIO_VALUE + v)) * 100,
    proposed: (c619Pro / (PORTFOLIO_VALUE + v)) * 100,
  }))

  const statusCopy = {
    green: "Compliant — within the 45% internal working ceiling.",
    amber: pro.util * 100 > a.workingCeiling ? "Above the 45% working ceiling but within the 50% statutory limit — rebalance." : "Compliant, but close to the 45% working ceiling.",
    red: "Exceeds the 50% statutory ceiling — a breach to remediate.",
  } as const

  return (
    <>
      <PageHeader
        eyebrow="Legal & Compliance · B17 simulator"
        title="The pivotal assumption: base-tier assets held elsewhere"
        description="If the Society holds qualifying base-tier instruments (bank deposits, G-Secs, T-Bills) outside this portfolio, they satisfy part or all of the base-tier requirement — and more of this portfolio may sit in funds. Establishing this figure is the single highest-value verification step (O2)."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Input">
          <div className="space-y-5">
            <RangeField
              label="Qualifying base-tier assets held elsewhere"
              value={x}
              min={0}
              max={120_000_000}
              step={500_000}
              onChange={(v) => set({ b17: v })}
              format={(v) => money(v)}
              marks={[
                { value: 0, label: "₹0" },
                { value: 4e7, label: "4 cr" },
                { value: pro.breakeven, label: "breakeven" },
                { value: 120_000_000, label: "12 cr" },
              ]}
            />
            <NumberField
              label="Or type an amount"
              value={Number((x / CRORE).toFixed(2))}
              step={0.05}
              min={0}
              suffix="₹ crore"
              onChange={(v) => set({ b17: Math.max(0, v) * CRORE })}
            />
            <div className="flex flex-wrap gap-1.5">
              {[0, 2e7, 4e7, pro.breakeven].map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set({ b17: Math.round(v) })}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:border-slate-400"
                >
                  {i === 3 ? `Breakeven ${money(v)}` : money(v)}
                </button>
              ))}
            </div>
            <SelectField
              label={canEditRecords ? "B17 confirmation status (shared; drives the Overview)" : "B17 confirmation status — sign in to change"}
              disabled={!canEditRecords}
              value={b17Status}
              onChange={(v) => setRecord("assumptionReg", "B17", { status: v })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Proposed portfolio — compliance at this input"
            actions={<StatusPill tone={pro.tone}>{pro.tone === "green" ? "Compliant" : pro.tone === "amber" ? "Close to / above working ceiling" : "Exceeds statutory ceiling"}</StatusPill>}
          >
            <div className="grid items-center gap-4 md:grid-cols-[260px_1fr]">
              <CapacityGauge util={pro.util} tone={pro.tone} size={260} />
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">{statusCopy[pro.tone]}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: STATUS_COLORS.good }} /> Green — ≤ {a.workingCeiling - a.amberBand}%</span>
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: STATUS_COLORS.warning }} /> Amber — {a.workingCeiling - a.amberBand}–{a.legalCeiling}%</span>
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: STATUS_COLORS.critical }} /> Red — &gt; {a.legalCeiling}% statutory</span>
                </div>
                <p className="text-xs text-slate-500">
                  The 45% line is the internal working ceiling (a management buffer); 50% is the adopted statutory ceiling.
                </p>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Total trust money" value={money(pro.total)} sub={`${money(PORTFOLIO_VALUE)} portfolio + ${money(x)}`} provenance="unconfirmed" />
            <Kpi label="50% Circular 619 maximum" value={money(pro.legalCap)} provenance="calculated" />
            <Kpi label="45% internal working ceiling" value={money(pro.workingCap)} provenance="calculated" />
            <Kpi label="Breakeven B17" value={money(pro.breakeven)} sub="For the proposal to stay 100% in funds" provenance="calculated" />
            <Kpi label="Current C619 exposure" value={money(cur.c619Amount)} sub={`${fmtPct(cur.util, 1)} of trust money`} provenance="measured" tone={cur.tone} />
            <Kpi label="Proposed C619 exposure" value={money(pro.c619Amount)} sub={`${fmtPct(pro.util, 1)} of trust money`} provenance="calculated" tone={pro.tone} />
            <Kpi label="Remaining headroom (to 45%)" value={money(pro.headroomWorking, { sign: true })} sub={`To 50%: ${money(pro.headroomLegal, { sign: true })}`} provenance="calculated" />
            <Kpi label="Must migrate to base tier" value={money(pro.migration)} sub="Into direct G-Secs / deposits" provenance="unconfirmed" tone={pro.migration > 0 ? "amber" : "green"} />
          </div>
        </div>
      </div>

      <Panel
        title="Utilisation as B17 changes"
        description="Circular 619 exposure ÷ (portfolio + B17)"
        actions={
          <div className="flex gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: PORTFOLIO_COLORS.current }} /> Current</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: PORTFOLIO_COLORS.proposed }} /> Proposed</span>
          </div>
        }
      >
        <ChartFrame
          chart={
            <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 720, height: 280 }}>
              <LineChart data={curve} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="x" type="number" domain={[0, 12]} ticks={[0, 2, 4, 6, 8, 10, 12]} tickFormatter={(v: number) => `₹${v} cr`} tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
                <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTip valueFormatter={(v) => `${v.toFixed(1)}%`} labelFormatter={(l) => `B17 = ₹${Number(l).toFixed(2)} cr`} />} />
                <ReferenceLine y={a.legalCeiling} stroke={STATUS_COLORS.critical} label={{ value: "50% legal", position: "insideTopRight", fontSize: 10, fill: CHART.muted }} />
                <ReferenceLine y={a.workingCeiling} stroke={STATUS_COLORS.warning} label={{ value: "45% working", position: "insideBottomRight", fontSize: 10, fill: CHART.muted }} />
                <ReferenceLine x={x / CRORE} stroke={CHART.ink} />
                <Line type="monotone" dataKey="current" name="Current" stroke={PORTFOLIO_COLORS.current} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="proposed" name="Proposed" stroke={PORTFOLIO_COLORS.proposed} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          }
          table={
            <TableWrap>
              <thead>
                <tr>
                  <Th>B17 (₹ cr)</Th>
                  <Th align="right">Current</Th>
                  <Th align="right">Proposed</Th>
                </tr>
              </thead>
              <tbody>
                {curve.filter((_, i) => i % 4 === 0).map((r) => (
                  <tr key={r.x}>
                    <Td>{r.x.toFixed(2)}</Td>
                    <Td align="right">{r.current.toFixed(1)}%</Td>
                    <Td align="right">{r.proposed.toFixed(1)}%</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          }
        />
      </Panel>

      <Panel title="Sensitivity table (Section 3.2)" description="Recomputed live for the proposal as it stands; the PDF's printed figures shown for reconciliation.">
        <TableWrap>
          <thead>
            <tr>
              <Th>Base-tier assets elsewhere (X)</Th>
              <Th align="right">Total trust money</Th>
              <Th align="right">Max in C619 tier (45%)</Th>
              <Th align="right">Must leave this portfolio</Th>
              <Th align="right">Status</Th>
              <Th align="right">PDF printed</Th>
            </tr>
          </thead>
          <tbody>
            {PDF_TABLE.map((r) => {
              const c = compliance(c619Pro, PORTFOLIO_VALUE, r.x, a)
              return (
                <tr key={r.x}>
                  <Td>{money(r.x)}</Td>
                  <Td align="right">{money(c.total)}</Td>
                  <Td align="right">{money(c.workingCap)}</Td>
                  <Td align="right">{c.migration < 1 ? "nil" : money(c.migration)}</Td>
                  <Td align="right">
                    <StatusPill tone={c.tone}>{fmtPct(c.util, 1)}</StatusPill>
                  </Td>
                  <Td align="right" className="text-xs text-slate-500">
                    {r.total} · {r.max} · {r.leave}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      </Panel>

      <Callout tone="red" title="This is an assumption requiring confirmation">
        B17 is currently <strong>{b17Status.toLowerCase()}</strong>. If qualifying base-tier assets of at least{" "}
        {money(pro.breakeven)} cannot be confirmed, the portfolio must itself hold base-tier instruments: at X = ₹0 that means
        placing {money(compliance(c619Pro, PORTFOLIO_VALUE, 0, a).migration)} in a direct G-Sec/SDL ladder and scheduled-bank
        FD ladder (the compliance fallback, §13.4).
      </Callout>
    </>
  )
}
