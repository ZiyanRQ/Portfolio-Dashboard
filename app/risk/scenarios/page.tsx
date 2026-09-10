"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { PORTFOLIO_VALUE } from "@/lib/data/portfolio"
import { CHART } from "@/lib/colors"
import { fmtRate } from "@/lib/format"
import { projectScenario, SCENARIO_PRESETS, type PresetKey, type ScenarioInputs } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { ChartFrame, ChartTip } from "@/components/dashboard/charts"
import { Button } from "@/components/ui/button"
import { Callout, Kpi, PageHeader, Panel, RangeField, Segmented, TableWrap, Td, Th } from "@/components/dashboard/ui"

const NOMINAL = "#2a78d6"
const REAL = "#eb6834"

const PRESET_TEXT: Record<PresetKey, string> = {
  bull: "Equities compound double-digit; rates stable/falling. PDF: portfolio ~11–13%.",
  base: "Equities ~10–12%; rates broadly stable. PDF: portfolio ~9%.",
  bear: "Equities fall 20–30% in the year; some rate volatility. PDF: portfolio down ~14–22% in the year.",
}

export default function ScenariosPage() {
  const { state, set, money, model } = useDashboard()
  const s = state.scenario
  const [show, setShow] = useState<"both" | "nominal" | "real">("both")
  const update = (patch: Partial<ScenarioInputs>) => set({ scenario: { ...s, ...patch, preset: "custom" } })
  const applyPreset = (p: PresetKey) => set({ scenario: { ...s, ...SCENARIO_PRESETS[p], preset: p } })

  const r = projectScenario(s, {
    start: PORTFOLIO_VALUE,
    ter: state.assumptions.directTer,
    fiDuration: model.proposed.duration.fiSleeve ?? 2.9,
    equityVol: state.assumptions.equityVol,
  })

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Scenarios"
        title="Scenario builder"
        description="Illustrative assumptions, not forecasts. No probabilities are assigned — the project has no defensible probability methodology."
        actions={
          <>
            <Segmented<PresetKey | "custom">
              ariaLabel="Preset"
              value={s.preset}
              onChange={(v) => v !== "custom" && applyPreset(v)}
              options={[
                { value: "bull", label: "Bull" },
                { value: "base", label: "Base" },
                { value: "bear", label: "Bear" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                update({
                  equityWeight: Math.round(model.proposed.equity * 1000) / 10,
                  liquidityWeight: Math.round(model.proposed.liquidity * 1000) / 10,
                })
              }
            >
              Sync allocation with proposed
            </Button>
          </>
        }
      />

      {s.preset !== "custom" && (
        <Callout tone="blue" title={`${s.preset[0].toUpperCase()}${s.preset.slice(1)} preset`}>
          {PRESET_TEXT[s.preset]} Preset values are dashboard calibrations chosen to reproduce the §17 illustrative ranges;
          every input remains editable.
        </Callout>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Assumptions">
          <div className="space-y-4">
            <RangeField label="Equity allocation" value={s.equityWeight} min={0} max={100} step={1} onChange={(v) => update({ equityWeight: v, liquidityWeight: Math.min(s.liquidityWeight, 100 - v) })} format={(v) => `${v}%`} />
            <RangeField label="Liquidity allocation" value={s.liquidityWeight} min={0} max={Math.max(0, 100 - s.equityWeight)} step={1} onChange={(v) => update({ liquidityWeight: v })} format={(v) => `${v}% (debt ${Math.max(0, 100 - s.equityWeight - v)}%)`} />
            <RangeField label="Equity return (long-run)" value={s.equityReturn} min={-5} max={20} step={0.25} onChange={(v) => update({ equityReturn: v })} format={(v) => `${v.toFixed(2)}%`} hint="PDF §14.1: 10–12% p.a. long-run assumption" />
            <RangeField label="Debt return" value={s.debtReturn} min={3} max={10} step={0.25} onChange={(v) => update({ debtReturn: v })} format={(v) => `${v.toFixed(2)}%`} hint="PDF: 6.5–7.5%" />
            <RangeField label="Liquidity return" value={s.liquidityReturn} min={3} max={9} step={0.25} onChange={(v) => update({ liquidityReturn: v })} format={(v) => `${v.toFixed(2)}%`} hint="PDF: 6.0–6.5%" />
            <RangeField label="Inflation" value={s.inflation} min={0} max={10} step={0.25} onChange={(v) => update({ inflation: v })} format={(v) => `${v.toFixed(2)}%`} hint="Not stated in the PDF. Default 4% = RBI CPI target mid-point (assumption)." />
            <RangeField label="Interest-rate change (year 1)" value={s.rateChange} min={-2} max={2} step={0.25} onChange={(v) => update({ rateChange: v })} format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} pp`} hint="Revalues debt by −duration × Δy in year 1, then lifts/lowers reinvestment yields." />
            <div className="space-y-2 rounded-md border border-slate-200 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input type="checkbox" checked={s.year1Override} onChange={(e) => update({ year1Override: e.target.checked })} className="accent-slate-800" />
                Year-1 equity shock (drawdown year)
              </label>
              {s.year1Override && (
                <RangeField label="Year-1 equity return" value={s.year1EquityReturn} min={-50} max={30} step={1} onChange={(v) => update({ year1EquityReturn: v })} format={(v) => `${v > 0 ? "+" : ""}${v}%`} />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Projection horizon</div>
              <Segmented<"1" | "5" | "10" | "20">
                ariaLabel="Horizon"
                value={String(s.horizon) as "1" | "5" | "10" | "20"}
                onChange={(v) => update({ horizon: Number(v) as ScenarioInputs["horizon"] })}
                options={[
                  { value: "1", label: "1 yr" },
                  { value: "5", label: "5 yrs" },
                  { value: "10", label: "10 yrs" },
                  { value: "20", label: "20 yrs" },
                ]}
              />
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Expected nominal return" value={fmtRate(r.steadyReturn, 2)} sub={`Net of ${state.assumptions.directTer}% Direct-plan cost`} provenance="assumption" />
            <Kpi label="Expected real return" value={fmtRate(r.realReturn, 2)} sub={`After ${s.inflation}% inflation`} provenance="assumption" />
            <Kpi label="Year-1 return" value={fmtRate(r.year1Return, 1, true)} sub={s.year1Override ? "Includes the drawdown year" : "Includes rate revaluation"} provenance="assumption" tone={r.year1Return < 0 ? "red" : undefined} />
            <Kpi label={`Corpus after ${s.horizon} yr${s.horizon > 1 ? "s" : ""}`} value={money(r.finalNominal)} sub={`Real ${money(r.finalReal)} · CAGR ${fmtRate(r.cagr, 2)}`} provenance="assumption" />
            <Kpi label="Portfolio risk (volatility)" value={fmtRate(r.volatility)} sub={`Equity weight × ${state.assumptions.equityVol}%`} provenance="assumption" />
            <Kpi label="Estimated income, year 1" value={money(r.incomeYear1)} sub="Accrual from debt + liquidity sleeves" provenance="assumption" />
            <Kpi label="Stress: equities −20% (1:1)" value={fmtRate(r.stressLoss20, 1, true)} sub={money((r.stressLoss20 / 100) * PORTFOLIO_VALUE, { sign: true })} provenance="assumption" />
            <Kpi label="Starting corpus" value={money(PORTFOLIO_VALUE)} provenance="measured" />
          </div>

          <Panel
            title="Projected corpus"
            description="Illustrative — realised returns will differ and can be negative in any year."
            actions={
              <Segmented
                size="xs"
                ariaLabel="Series"
                value={show}
                onChange={setShow}
                options={[
                  { value: "both", label: "Both" },
                  { value: "nominal", label: "Nominal" },
                  { value: "real", label: "Real" },
                ]}
              />
            }
          >
            <div className="mb-2 flex gap-3 text-xs text-slate-600">
              {show !== "real" && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded" style={{ background: NOMINAL }} /> Nominal
                </span>
              )}
              {show !== "nominal" && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded" style={{ background: REAL }} /> Real (today&apos;s money)
                </span>
              )}
            </div>
            <ChartFrame
              chart={
                <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 640, height: 280 }}>
                  <AreaChart data={r.series} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={{ stroke: CHART.axis }} tickFormatter={(v) => `Y${v}`} />
                    <YAxis tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => money(v, { digits: 1 })} domain={["auto", "auto"]} />
                    <Tooltip content={<ChartTip valueFormatter={(v) => money(v)} labelFormatter={(l) => `Year ${String(l)}`} />} />
                    {show !== "real" && <Area type="monotone" dataKey="nominal" name="Nominal" stroke={NOMINAL} strokeWidth={2} fill={NOMINAL} fillOpacity={0.1} dot={false} isAnimationActive={false} />}
                    {show !== "nominal" && <Area type="monotone" dataKey="real" name="Real" stroke={REAL} strokeWidth={2} fill={REAL} fillOpacity={0.1} dot={false} isAnimationActive={false} />}
                  </AreaChart>
                </ResponsiveContainer>
              }
              table={
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Year</Th>
                      <Th align="right">Nominal</Th>
                      <Th align="right">Real</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.series.map((p) => (
                      <tr key={p.year}>
                        <Td>{p.year}</Td>
                        <Td align="right">{money(p.nominal)}</Td>
                        <Td align="right">{money(p.real)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              }
            />
          </Panel>
        </div>
      </div>
    </>
  )
}
