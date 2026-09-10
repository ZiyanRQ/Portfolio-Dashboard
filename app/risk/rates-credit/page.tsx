"use client"

import { useState } from "react"

import { FUNDS, type Fund } from "@/lib/data/funds"
import { fmtNum, fmtPct, fmtRate } from "@/lib/format"
import { durationImpact, PORTFOLIO_LABELS, rateShock, type PortfolioKey } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { StackBar } from "@/components/dashboard/charts"
import { FundButton } from "@/components/dashboard/common"
import { Callout, Formula, Kpi, NA, PageHeader, Panel, Provenance, RangeField, Segmented, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]
const AAA = "#2a78d6"
const BELOW = "#eb6834"
const UNDISCLOSED = "#cbd5e1"

function creditSegments(f: Fund) {
  const aaa = f.credit?.aaaSovereign ?? 0
  const below = f.credit?.belowAAA ?? 0
  return [
    { key: "aaa", label: "AAA / sovereign / A1+ (combined in source)", value: aaa, color: AAA, display: `${aaa}%` },
    { key: "below", label: "Below AAA (grade split not disclosed)", value: below, color: BELOW, display: `${below}%` },
    { key: "und", label: "Not disclosed", value: Math.max(0, 100 - aaa - below), color: UNDISCLOSED, display: `${Math.max(0, 100 - aaa - below).toFixed(1)}%` },
  ]
}

export default function RatesCreditPage() {
  const { model, state, set, money } = useDashboard()
  const m = model.selected
  const dy = state.rateShock
  const [creditView, setCreditView] = useState<"sleeve" | "funds">("sleeve")

  const income = m.positions.filter((p) => p.fund.assetClass === "fixed-income" || p.fund.assetClass === "liquidity" || p.fund.assetClass === "base-tier")
  const debtFunds = m.positions.filter((p) => p.fund.assetClass === "fixed-income")
  const sleeveImpact = debtFunds.reduce((s, p) => s + p.value * ((durationImpact(p.fund.duration, dy) ?? 0) / 100), 0)
  const sleeveValue = debtFunds.reduce((s, p) => s + p.value, 0)
  const portfolioPct = rateShock(m, dy)
  const incomeFunds = FUNDS.filter((f) => (f.assetClass === "fixed-income" || f.assetClass === "liquidity") && f.researchStatus !== "instrument")
  const belowAAAValue = m.credit.belowAAA * m.value

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Rates / Credit"
        title="Interest-rate stress and credit quality"
        description="The income sleeve is built for stability: modest, deliberate duration and ~97–99% AAA/sovereign credit, with one below-AAA caveat."
        actions={
          <Segmented<PortfolioKey>
            ariaLabel="Portfolio"
            value={state.portfolioView}
            onChange={(v) => set({ portfolioView: v })}
            options={KEYS.map((k) => ({ value: k, label: PORTFOLIO_LABELS[k] }))}
          />
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Rate shock">
          <RangeField
            label="Parallel yield change"
            value={dy}
            min={-2}
            max={2}
            step={0.25}
            onChange={(v) => set({ rateShock: v })}
            format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} pp`}
            marks={[
              { value: -2, label: "−2%" },
              { value: 0, label: "0" },
              { value: 2, label: "+2%" },
            ]}
          />
          <div className="mt-4 space-y-2 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              Duration approximation <Provenance kind="estimated" />
            </div>
            <Formula>ΔP / P ≈ −D_mod × Δy</Formula>
            <p>
              First-order only: ignores convexity, spread changes, roll-down and accrual. Durations from the proposal: ICICI
              Corporate Bond ~3.5 yrs; HDFC Short Duration 1–3 yrs (2.0 mid-point used — reproduces the PDF&apos;s −0.7% for
              +1%); ICICI Liquid ~70 days. Direct base-tier instruments are held to maturity and not marked to market.
            </p>
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Debt sleeve impact" value={sleeveValue > 0 ? fmtRate((sleeveImpact / sleeveValue) * 100, 2, true) : "—"} sub={money(sleeveImpact, { sign: true })} provenance="estimated" />
            <Kpi label="Whole-portfolio impact" value={fmtRate(portfolioPct, 2, true)} sub={money((portfolioPct / 100) * m.value, { sign: true })} provenance="estimated" />
            <Kpi label="Debt-sleeve duration" value={m.duration.fiSleeve === null ? "—" : `${fmtNum(m.duration.fiSleeve)} yrs`} provenance="estimated" />
            <Kpi label="Duration coverage" value={fmtPct(m.duration.coverage, 0)} sub={m.duration.missing.length ? `Missing: ${m.duration.missing.join(", ")}` : "All income holdings"} provenance={m.duration.coverage < 1 ? "na" : "measured"} />
          </div>

          <Panel title={`Impact by holding at ${dy > 0 ? "+" : ""}${dy.toFixed(2)} pp — ${PORTFOLIO_LABELS[state.portfolioView]}`}>
            {income.length === 0 ? (
              <p className="text-sm text-slate-600">No income holdings in this portfolio.</p>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Holding</Th>
                    <Th align="right">Weight</Th>
                    <Th align="right">Value</Th>
                    <Th align="right">Duration</Th>
                    <Th align="right">Price impact</Th>
                    <Th align="right">Monetary impact</Th>
                  </tr>
                </thead>
                <tbody>
                  {income.map((p) => {
                    const held = p.fund.assetClass === "base-tier"
                    const imp = held ? 0 : durationImpact(p.fund.duration, dy)
                    return (
                      <tr key={p.key}>
                        <Td>
                          <FundButton fund={p.fund} />
                        </Td>
                        <Td align="right">{fmtPct(p.weight, 1)}</Td>
                        <Td align="right">{money(p.value)}</Td>
                        <Td align="right">
                          {held ? "HTM" : p.fund.duration === null ? <NA /> : `${fmtNum(p.fund.duration)} yrs`}
                          {p.fund.durationEstimated && <span className="ml-1 text-[10px] text-amber-700">est.</span>}
                        </Td>
                        <Td align="right">{imp === null ? <NA /> : fmtRate(imp, 2, true)}</Td>
                        <Td align="right">{imp === null ? <NA /> : money((imp / 100) * p.value, { sign: true })}</Td>
                      </tr>
                    )
                  })}
                  <tr className="font-semibold">
                    <Td>Whole portfolio</Td>
                    <Td align="right">100%</Td>
                    <Td align="right">{money(m.value)}</Td>
                    <Td align="right">{fmtNum(m.duration.portfolio)} yrs (Σw·D)</Td>
                    <Td align="right">{fmtRate(portfolioPct, 2, true)}</Td>
                    <Td align="right">{money((portfolioPct / 100) * m.value, { sign: true })}</Td>
                  </tr>
                </tbody>
              </TableWrap>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Credit quality explorer"
        description="The proposal discloses AAA and sovereign as one combined share and below-AAA as one figure; finer grades are not available."
        actions={
          <Segmented
            size="xs"
            ariaLabel="Credit view"
            value={creditView}
            onChange={setCreditView}
            options={[
              { value: "sleeve", label: "Combined debt sleeve" },
              { value: "funds", label: "Individual funds" },
            ]}
          />
        }
      >
        {creditView === "sleeve" ? (
          m.credit.sleeveWeight > 0 ? (
            <div className="space-y-3">
              <StackBar
                height={26}
                segments={[
                  { key: "aaa", label: "AAA / sovereign / A1+ (combined)", value: m.credit.aaaSovereign, color: AAA, display: fmtPct(m.credit.aaaSovereign / m.credit.sleeveWeight, 1) },
                  { key: "below", label: "Below AAA (split not disclosed)", value: m.credit.belowAAA, color: BELOW, display: fmtPct(m.credit.belowAAA / m.credit.sleeveWeight, 1) },
                  { key: "und", label: "Not disclosed", value: m.credit.undisclosed, color: UNDISCLOSED, display: fmtPct(m.credit.undisclosed / m.credit.sleeveWeight, 1) },
                ]}
              />
              <p className="text-xs text-slate-500">
                Share of the {fmtPct(m.credit.sleeveWeight, 0)} debt + liquidity sleeve in the {PORTFOLIO_LABELS[state.portfolioView].toLowerCase()} portfolio.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">This portfolio has no debt sleeve with disclosed credit data.</p>
          )
        ) : (
          <div className="space-y-4">
            {incomeFunds.map((f) => (
              <div key={f.id} className="grid gap-2 sm:grid-cols-[14rem_1fr]">
                <div>
                  <FundButton fund={f} className="text-sm" />
                  <div className="text-[11px] text-slate-500">{f.credit?.note ?? "Credit profile not disclosed in the proposal"}</div>
                </div>
                <StackBar segments={creditSegments(f)} legend={false} height={16} />
              </div>
            ))}
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              {creditSegments(incomeFunds[0]).map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} /> {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <TableWrap>
            <thead>
              <tr>
                <Th>Rating bucket</Th>
                <Th>Disclosure in source</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Sovereign", "Combined with AAA (ICICI Corporate Bond ~99% AAA/sovereign)"],
                ["AAA", "Combined with sovereign / A1+ (ICICI Liquid ~98% AAA/A1+)"],
                ["AA+", "Not disclosed separately — part of HDFC Short Duration's ~16.5% below-AAA"],
                ["AA", "Not disclosed separately — part of the same 16.5%"],
                ["Below AA", "Not disclosed; Circular 619 provisos require a minimum AA from two agencies for direct debt"],
                ["Cash", "Not disclosed separately"],
              ].map(([b, d]) => (
                <tr key={b}>
                  <Td className="font-medium text-slate-800">{b}</Td>
                  <Td className="text-xs whitespace-normal text-slate-600">{d}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      </Panel>

      {m.credit.belowAAA > 0 && (
        <Callout tone="amber" title="Monitoring warning — below-AAA exposure">
          {fmtPct(m.credit.belowAAA, 2)} of the portfolio ({money(belowAAAValue)}) is rated below AAA, all through HDFC Short
          Duration. Quarterly credit review: a downgrade within that sleeve triggers a review (§20). The factsheet used is
          ~13 months old (O11). <StatusPill tone="amber" className="ml-1">Quarterly</StatusPill>
        </Callout>
      )}
    </>
  )
}
