"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { CHART, PORTFOLIO_COLORS } from "@/lib/colors"
import { fmtNum, fmtRate } from "@/lib/format"
import { equityShock, PORTFOLIO_LABELS, STRESS_METHOD_LABELS, type PortfolioKey, type StressMethod } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { ChartFrame, ChartTip } from "@/components/dashboard/charts"
import { STRESS_SCENARIOS } from "@/components/dashboard/common"
import { Callout, PageHeader, Panel, Provenance, RangeField, Segmented, TableWrap, Td, Th } from "@/components/dashboard/ui"

const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]

export default function StressPage() {
  const { model, state, set, money } = useDashboard()
  const shock = state.stressShock
  const method = state.stressMethod
  const curve = Array.from({ length: 17 }, (_, i) => -50 + i * 5).map((s) => ({
    shock: s,
    current: equityShock(model.current, s, method),
    proposed: equityShock(model.proposed, s, method),
    fallback: equityShock(model.fallback, s, method),
  }))

  const resultTable = (
    <TableWrap>
      <thead>
        <tr>
          <Th>Portfolio</Th>
          <Th align="right">Sensitivity used</Th>
          <Th align="right">% impact</Th>
          <Th align="right">Monetary impact</Th>
          <Th align="right">Value after shock</Th>
        </tr>
      </thead>
      <tbody>
        {KEYS.map((k) => {
          const m = model.byKey[k]
          const pct = equityShock(m, shock, method)
          return (
            <tr key={k}>
              <Td>
                <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                  <span className="h-0.5 w-3 rounded" style={{ background: PORTFOLIO_COLORS[k] }} />
                  {PORTFOLIO_LABELS[k]}
                </span>
              </Td>
              <Td align="right">{method === "beta" ? `β ${fmtNum(m.beta)}` : `equity ${fmtRate(m.equity * 100, 1)}`}</Td>
              <Td align="right" className="font-semibold text-slate-900">{fmtRate(pct, 1, true)}</Td>
              <Td align="right">{money((pct / 100) * m.value, { sign: true })}</Td>
              <Td align="right">{money(m.value * (1 + pct / 100))}</Td>
            </tr>
          )
        })}
      </tbody>
    </TableWrap>
  )

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Stress testing"
        title="Equity-market shock"
        description="Scenarios, not forecasts. Move the slider to apply an Indian-equity market move to each portfolio."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Shock controls">
          <div className="space-y-5">
            <RangeField
              label="Indian-equity market move"
              value={shock}
              min={-50}
              max={30}
              step={1}
              onChange={(v) => set({ stressShock: v })}
              format={(v) => `${v > 0 ? "+" : ""}${v}%`}
              marks={[
                { value: -50, label: "−50%" },
                { value: -35, label: "−35" },
                { value: -20, label: "−20" },
                { value: -10, label: "−10" },
                { value: 0, label: "0" },
                { value: 30, label: "+30%" },
              ]}
            />
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600">Methodology</div>
              <Segmented<StressMethod>
                ariaLabel="Stress methodology"
                value={method}
                onChange={(v) => set({ stressMethod: v })}
                options={[
                  { value: "beta", label: STRESS_METHOD_LABELS.beta },
                  { value: "one-to-one", label: "Conservative 1:1" },
                ]}
              />
              <div className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                {method === "beta" ? (
                  <>
                    <div className="mb-1 flex items-center gap-1.5 font-semibold text-slate-800">
                      Beta-based model <Provenance kind="estimated" />
                    </div>
                    Portfolio loss = holdings-based equity-market beta × shock. Debt and liquidity sleeves are treated as
                    zero-beta. Lower-beta funds (Parag Parikh 0.60) soften the fall.
                  </>
                ) : (
                  <>
                    <div className="mb-1 flex items-center gap-1.5 font-semibold text-slate-800">
                      Conservative 1:1 equity stress <Provenance kind="assumption" />
                    </div>
                    Portfolio loss = equity weight × shock, assuming every equity fund has beta 1.0. The PDF retains this as
                    a conservative ceiling (Appendix H).
                  </>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={`Result at ${shock > 0 ? "+" : ""}${shock}% — ${STRESS_METHOD_LABELS[method]}`}>{resultTable}</Panel>
          <Panel
            title="Impact across the shock range"
            actions={
              <div className="flex gap-3 text-xs text-slate-600">
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
                <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 640, height: 260 }}>
                  <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="shock"
                      type="number"
                      domain={[-50, 30]}
                      ticks={[-50, -40, -30, -20, -10, 0, 10, 20, 30]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fontSize: 11, fill: CHART.muted }}
                      tickLine={false}
                      axisLine={{ stroke: CHART.axis }}
                    />
                    <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: CHART.muted }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTip valueFormatter={(v) => fmtRate(v, 1, true)} labelFormatter={(l) => `Equities ${Number(l) > 0 ? "+" : ""}${String(l)}%`} />} />
                    <ReferenceLine y={0} stroke={CHART.axis} />
                    <ReferenceLine x={shock} stroke={CHART.ink} strokeWidth={1} label={{ value: "selected", position: "insideTopRight", fontSize: 10, fill: CHART.muted }} />
                    {KEYS.map((k) => (
                      <Line key={k} type="linear" dataKey={k} name={PORTFOLIO_LABELS[k]} stroke={PORTFOLIO_COLORS[k]} strokeWidth={2} dot={false} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              }
              table={
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Shock</Th>
                      {KEYS.map((k) => (
                        <Th key={k} align="right">
                          {PORTFOLIO_LABELS[k]}
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {curve.map((r) => (
                      <tr key={r.shock}>
                        <Td>{r.shock}%</Td>
                        {KEYS.map((k) => (
                          <Td key={k} align="right">
                            {fmtRate(r[k], 1, true)}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              }
            />
          </Panel>
        </div>
      </div>

      <Panel title="Scenario table (Section 16)" description="Fixed scenarios; the proposed column follows the builder.">
        <TableWrap>
          <thead>
            <tr>
              <Th>Scenario</Th>
              <Th align="right">Current</Th>
              <Th align="right">Proposed</Th>
              <Th align="right">Fallback</Th>
              <Th>Method</Th>
            </tr>
          </thead>
          <tbody>
            {STRESS_SCENARIOS.map((s) => (
              <tr key={s.key}>
                <Td className="font-medium text-slate-800">{s.label}</Td>
                {KEYS.map((k) => {
                  const v = s.run(model.byKey[k])
                  return (
                    <Td key={k} align="right">
                      {fmtRate(v, 1, true)}
                      <div className="text-[11px] text-slate-400">{money((v / 100) * model.byKey[k].value, { sign: true })}</div>
                    </Td>
                  )
                })}
                <Td className="text-xs text-slate-500">{s.method}</Td>
              </tr>
            ))}
            <tr>
              <Td className="font-medium text-slate-800">Credit spreads widen</Td>
              <Td align="right">negligible</Td>
              <Td align="right" className="text-xs">small (~16.5% below-AAA in one fund)</Td>
              <Td align="right" className="text-xs">smaller</Td>
              <Td className="text-xs text-slate-500">Below-AAA exposure (qualitative)</Td>
            </tr>
            <tr>
              <Td className="font-medium text-slate-800">Liquidity stress</Td>
              <Td align="right" className="text-xs">fails — {fmtRate(model.current.liquidity * 100, 1)} liquid</Td>
              <Td align="right" className="text-xs">{fmtRate(model.proposed.liquidity * 100, 0)} liquid + daily-dealing funds</Td>
              <Td align="right" className="text-xs">{fmtRate(model.fallback.liquidity * 100, 1)} liquid + base-tier ladder</Td>
              <Td className="text-xs text-slate-500">Available cash sleeve</Td>
            </tr>
          </tbody>
        </TableWrap>
      </Panel>

      <Callout tone="neutral">
        The proposed portfolio loses materially less in every equity and concentration scenario, at the cost of small,
        deliberate rate and credit exposures the current book does not carry. Rate scenarios use −modified duration × Δyield
        on the debt sleeve (see Rates / Credit).
      </Callout>
    </>
  )
}
