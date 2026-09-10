"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { PDF_FIGURES, PORTFOLIO_VALUE } from "@/lib/data/portfolio"
import { CHART } from "@/lib/colors"
import { convert, fmtRate } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { ChartFrame, ChartTip } from "@/components/dashboard/charts"
import { Button } from "@/components/ui/button"
import { Callout, Kpi, PageHeader, Panel, RangeField, Swatch, TableWrap, Td, Th } from "@/components/dashboard/ui"

const SIMPLE = "#2a78d6"
const COMPOUND = "#eb6834"

export default function CostsPage() {
  const { state, set, money, model, rates } = useDashboard()
  const f = state.fees
  const value = f.value ?? PORTFOLIO_VALUE
  const gross = f.gross ?? Number(model.proposed.grossReturn.toFixed(2))
  const d = f.diff / 100
  const g = gross / 100
  const annual = value * d
  const compounded = (n: number) => value * (Math.pow(1 + g, n) - Math.pow(1 + g - d, n))
  const years = Array.from({ length: f.years + 1 }, (_, n) => ({ year: n, simple: annual * n, compounded: compounded(n) }))
  const setFees = (patch: Partial<typeof f>) => set({ fees: { ...f, ...patch } })

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Fee saving"
        title="Regular vs Direct plan cost calculator"
        description="Every current holding is a Regular plan, paying distributor commission inside the expense ratio. Direct plans hold the same portfolio without it."
        actions={
          <Button variant="outline" size="sm" onClick={() => set({ fees: { value: null, diff: 0.9, years: 10, gross: null } })}>
            Reset to PDF defaults
          </Button>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Assumptions">
          <div className="space-y-5">
            <RangeField
              label="Portfolio value"
              value={value}
              min={10_000_000}
              max={200_000_000}
              step={500_000}
              onChange={(v) => setFees({ value: v })}
              format={(v) => money(v)}
              hint={`Default: current portfolio value ${money(PORTFOLIO_VALUE)}`}
            />
            <RangeField
              label="Regular-to-Direct TER difference"
              value={f.diff}
              min={0.1}
              max={1.5}
              step={0.05}
              onChange={(v) => setFees({ diff: v })}
              format={(v) => `${v.toFixed(2)}% p.a.`}
              marks={[
                { value: PDF_FIGURES.terDiffLow, label: "0.8" },
                { value: PDF_FIGURES.terDiffHigh, label: "1.0" },
              ]}
              hint="PDF §8: ~0.8–1.0% p.a. avoidable; default is the mid-point 0.9%."
            />
            <RangeField label="Time horizon" value={f.years} min={1} max={25} onChange={(v) => setFees({ years: v })} format={(v) => `${v} years`} />
            <RangeField
              label="Gross return used for compounding"
              value={gross}
              min={4}
              max={14}
              step={0.25}
              onChange={(v) => setFees({ gross: v })}
              format={(v) => `${v.toFixed(2)}% p.a.`}
              hint="Default: the proposed portfolio's illustrative gross return (§14.1)."
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Annual saving" value={money(annual)} sub={`${fmtRate(f.diff, 2)} × ${money(value)}`} provenance="assumption" tone="green" />
            <Kpi label="5-year saving" value={money(annual * 5)} sub="Simple, uncompounded" provenance="assumption" />
            <Kpi label="10-year saving" value={money(annual * 10)} sub="Simple, uncompounded" provenance="assumption" />
            <Kpi label={`Compounded opportunity cost, ${f.years} yrs`} value={money(compounded(f.years))} sub={`At ${gross.toFixed(2)}% gross`} provenance="assumption" tone="green" />
          </div>

          <Panel
            title="Cumulative cost of staying in Regular plans"
            actions={
              <div className="flex gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded" style={{ background: SIMPLE }} /> Simple saving
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded" style={{ background: COMPOUND }} /> Compounded opportunity cost
                </span>
              </div>
            }
          >
            <ChartFrame
              chart={
                <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 640, height: 280 }}>
                  <LineChart data={years} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={{ stroke: CHART.axis }} tickFormatter={(v) => `Y${v}`} />
                    <YAxis
                      tick={{ fontSize: 11, fill: CHART.muted }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(v: number) => money(v, { digits: 1 })}
                    />
                    <Tooltip content={<ChartTip valueFormatter={(v) => money(v)} labelFormatter={(l) => `Year ${String(l)}`} />} />
                    <Line type="monotone" dataKey="simple" name="Simple saving" stroke={SIMPLE} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="compounded" name="Compounded opportunity cost" stroke={COMPOUND} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              }
              table={
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Year</Th>
                      <Th align="right">Simple saving</Th>
                      <Th align="right">Compounded opportunity cost</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.slice(1).map((y) => (
                      <tr key={y.year}>
                        <Td>{y.year}</Td>
                        <Td align="right">{money(y.simple)}</Td>
                        <Td align="right">{money(y.compounded)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              }
            />
            <p className="mt-2 text-xs text-slate-500">
              Compounded opportunity cost = V × [(1 + g)ⁿ − (1 + g − Δ)ⁿ]: the terminal-value gap between the same portfolio in
              Direct and Regular plans. Illustrative; values in {state.currency}
              {state.currency !== "INR" && ` at ₹${(PORTFOLIO_VALUE / convert(PORTFOLIO_VALUE, state.currency, rates)).toFixed(2)} per unit`}.
            </p>
          </Panel>

          <Callout tone="amber" title="Reconciliation note R1">
            The proposal prints “~0.8–1.0% p.a. avoidable ≈ ₹6–7 lakh a year”. Applied to the ₹5.29 cr portfolio, 0.8–1.0%
            is <strong>{money(PORTFOLIO_VALUE * 0.008)} – {money(PORTFOLIO_VALUE * 0.01)}</strong> a year. The rupee figure
            is not reproduced by the stated rate; this calculator uses the rate. The previous adviser&apos;s cost estimate
            (source of the figure) should be checked (B16).
          </Callout>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Swatch color={SIMPLE} /> Portfolio value input is shared with no other page; the TER differential here does not
            change the model-wide Regular-plan premium ({state.assumptions.regularPremium}%), which drives fee KPIs elsewhere.
          </div>
        </div>
      </div>
    </>
  )
}
