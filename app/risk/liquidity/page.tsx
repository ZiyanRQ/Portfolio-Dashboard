"use client"

import { fmtNum, fmtPct } from "@/lib/format"
import { PORTFOLIO_LABELS } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { Callout, Kpi, NumberField, PageHeader, Panel, Segmented, TableWrap, Td, Th } from "@/components/dashboard/ui"

const LAKH = 100_000

export default function LiquidityPage() {
  const { state, set, model, money } = useDashboard()
  const l = state.liquidity
  const setL = (patch: Partial<typeof l>) => set({ liquidity: { ...l, ...patch } })
  const monthly = (l.payroll + l.other) * LAKH
  const required = monthly * l.months

  const liquidOf = (key: "current" | "proposed" | "fallback") => {
    const m = model.byKey[key]
    const primary = m.liquidity * m.value
    const secondary = l.includeDebt ? m.fixedIncome * m.value : 0
    return { primary, total: primary + secondary }
  }
  const cur = liquidOf("current")
  const pro = liquidOf("proposed")
  const fb = liquidOf("fallback")
  const hasInput = monthly > 0

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Liquidity"
        title="Payroll reserve calculator"
        description="Does the 6% liquidity sleeve cover the Society's fee cycle and payroll? The proposal sizes liquidity by assumption (B14) because no payroll or fee-cycle data was available."
      />

      <Callout tone="amber" title="Input required">
        Monthly payroll and operating costs are not in the source material. Enter the Society&apos;s figures (₹ lakh per month)
        to test adequacy. Until then, the breakeven table below shows the largest monthly outflow each sleeve can cover.
      </Callout>

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Operating inputs">
          <div className="space-y-4">
            <NumberField label="Monthly payroll" value={l.payroll || null} placeholder="e.g. 25" onChange={(v) => setL({ payroll: Math.max(0, v) })} suffix="₹ lakh / month" step={0.5} min={0} />
            <NumberField label="Other operating costs" value={l.other || null} placeholder="e.g. 5" onChange={(v) => setL({ other: Math.max(0, v) })} suffix="₹ lakh / month" step={0.5} min={0} />
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Desired reserve period</div>
              <Segmented<"1" | "2" | "3" | "6">
                ariaLabel="Reserve months"
                value={String(l.months) as "1" | "2" | "3" | "6"}
                onChange={(v) => setL({ months: Number(v) as 1 | 2 | 3 | 6 })}
                options={[
                  { value: "1", label: "1 month" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
                  { value: "6", label: "6 months" },
                ]}
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" className="mt-0.5 accent-slate-800" checked={l.includeDebt} onChange={(e) => setL({ includeDebt: e.target.checked })} />
              <span>
                Count daily-dealing debt funds as secondary liquidity
                <span className="block text-[11px] text-slate-500">They redeem within days but carry small mark-to-market risk.</span>
              </span>
            </label>
            {hasInput && <p className="text-xs text-slate-600">Monthly expenditure: <strong>{money(monthly)}</strong></p>}
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Required reserve" value={hasInput ? money(required) : "Requires input"} sub={`${l.months} month${l.months > 1 ? "s" : ""} of expenditure`} provenance={hasInput ? "assumption" : "na"} />
            <Kpi label="Current liquid assets" value={money(cur.total)} sub={`ABSL Liquid ${fmtPct(model.current.liquidity, 1)}`} provenance="measured" tone={hasInput ? (cur.total >= required ? "green" : "red") : undefined} />
            <Kpi label="Proposed liquid allocation" value={money(pro.total)} sub={`${fmtPct(model.proposed.liquidity, 0)} liquid${l.includeDebt ? " + debt funds" : ""}`} provenance="calculated" tone={hasInput ? (pro.total >= required ? "green" : "red") : undefined} />
            <Kpi
              label="Months covered (proposed)"
              value={hasInput ? fmtNum(pro.total / monthly, 1) : "—"}
              sub={hasInput ? `Current: ${fmtNum(cur.total / monthly, 1)} months` : "Enter monthly costs"}
              provenance={hasInput ? "calculated" : "na"}
            />
          </div>

          {hasInput && (
            <Panel title="Shortfall / surplus against the reserve target">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Portfolio</Th>
                    <Th align="right">Liquid assets</Th>
                    <Th align="right">Months covered</Th>
                    <Th align="right">Reserve target</Th>
                    <Th align="right">Shortfall / surplus</Th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["current", cur],
                      ["proposed", pro],
                      ["fallback", fb],
                    ] as const
                  ).map(([k, v]) => {
                    const gap = v.total - required
                    return (
                      <tr key={k}>
                        <Td className="font-medium text-slate-800">{PORTFOLIO_LABELS[k]}</Td>
                        <Td align="right">{money(v.total)}</Td>
                        <Td align="right">{fmtNum(v.total / monthly, 1)}</Td>
                        <Td align="right">{money(required)}</Td>
                        <Td align="right" className={gap >= 0 ? "font-semibold text-[#006300]" : "font-semibold text-red-700"}>
                          {money(gap, { sign: true })}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>
              <p className="mt-2 text-xs text-slate-500">
                The compliance fallback also holds a base-tier ladder (FDs / G-Secs); FD tenors can be laddered to add
                scheduled liquidity, but they are not counted here.
              </p>
            </Panel>
          )}

          <Panel title="Breakeven — largest monthly outflow each sleeve can cover" description="No input needed">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reserve period</Th>
                  <Th align="right">Current ({money(cur.total)})</Th>
                  <Th align="right">Proposed ({money(pro.total)})</Th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 6].map((n) => (
                  <tr key={n} className={n === l.months ? "bg-blue-50/50" : undefined}>
                    <Td>{n} month{n > 1 ? "s" : ""}</Td>
                    <Td align="right">{money(cur.total / n)} / month</Td>
                    <Td align="right">{money(pro.total / n)} / month</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
      </div>
    </>
  )
}
