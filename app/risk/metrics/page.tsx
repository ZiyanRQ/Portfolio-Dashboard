"use client"

import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { PORTFOLIO_LABELS, type Metrics, type PortfolioKey } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { Callout, Kpi, NA, PageHeader, Panel, Provenance, Segmented, TableWrap, Td, Th, type ProvenanceKind } from "@/components/dashboard/ui"

const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]

export default function RiskMetricsPage() {
  const { model, state, set, money } = useDashboard()
  const m = model.selected

  const creditShare = (x: Metrics) => (x.credit.sleeveWeight > 0 ? x.credit.aaaSovereign / x.credit.sleeveWeight : null)

  const rows: { label: string; prov: ProvenanceKind; get: (x: Metrics) => React.ReactNode; note?: string }[] = [
    { label: "Whole-portfolio beta", prov: "estimated", get: (x) => fmtNum(x.beta), note: "Σ weight × equity-fund beta; debt/cash ≈ 0" },
    { label: "Equity-sleeve beta", prov: "estimated", get: (x) => (x.equitySleeveBeta === null ? "—" : fmtNum(x.equitySleeveBeta)), note: "Portfolio beta ÷ equity weight" },
    { label: "Alpha-attribution proxy", prov: "estimated", get: (x) => fmtPP(x.alphaProxy), note: "Σ weight × reported 3-yr Jensen alpha" },
    { label: "Expected return (net)", prov: "assumption", get: (x) => fmtRate(x.expectedReturn), note: "Sleeve return assumptions − costs (§14.1)" },
    { label: "Estimated volatility", prov: "assumption", get: (x) => fmtRate(x.volatility), note: `Equity weight × ${state.assumptions.equityVol}% assumed equity volatility` },
    { label: "Largest holding", prov: "calculated", get: (x) => `${fmtPct(x.largest?.weight ?? 0)} (${x.largest?.fund.shortName ?? "—"})` },
    { label: "Top-5 concentration", prov: "calculated", get: (x) => fmtPct(x.top5) },
    { label: "HHI / effective N", prov: "calculated", get: (x) => `${Math.round(x.hhi)} / ${fmtNum(x.effectiveN, 1)}` },
    {
      label: "Credit: AAA / sovereign / A1+ share of income sleeve",
      prov: "measured",
      get: (x) => {
        const c = creditShare(x)
        return c === null ? <NA reason="No income sleeve" /> : `${fmtPct(c)} (disclosed)`
      },
      note: "Split between AAA and sovereign is not disclosed",
    },
    { label: "Credit: below-AAA (of portfolio)", prov: "measured", get: (x) => fmtPct(x.credit.belowAAA, 2), note: "HDFC Short Duration ~16.5% below-AAA" },
    { label: "Duration — fixed-income sleeve", prov: "estimated", get: (x) => (x.duration.fiSleeve === null ? <NA reason="No debt funds" /> : `${fmtNum(x.duration.fiSleeve)} yrs`) },
    { label: "Duration — portfolio contribution", prov: "estimated", get: (x) => `${fmtNum(x.duration.portfolio, 2)} yrs`, note: "Σ weight × duration; −1% per year of this per +1% rates" },
    { label: "Foreign exposure", prov: "measured", get: (x) => `${fmtPct(x.foreign.value, 1)} · coverage ${fmtPct(x.foreign.coverage, 0)}`, note: "Coverage = share of equity with disclosed foreign %" },
    { label: "Sector exposure", prov: "na", get: () => <NA reason="Not computable — no full look-through" />, note: "Financials are the largest single sector (qualitative)" },
    { label: "Liquidity", prov: "calculated", get: (x) => `${fmtPct(x.liquidity, 1)} · ${money(x.liquidity * x.value)}` },
    { label: "Sharpe / Sortino", prov: "na", get: () => <NA reason="n/c — needs return series (O10)" /> },
    { label: "Maximum drawdown", prov: "na", get: () => <NA reason="n/c — undisclosed / no history" /> },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Metrics"
        title="Risk metrics"
        description="Holdings-based risk statistics for each portfolio. Figures the evidence cannot support are shown as not computed rather than estimated."
        actions={
          <Segmented<PortfolioKey>
            ariaLabel="Portfolio"
            value={state.portfolioView}
            onChange={(v) => set({ portfolioView: v })}
            options={KEYS.map((k) => ({ value: k, label: PORTFOLIO_LABELS[k] }))}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={`${PORTFOLIO_LABELS[state.portfolioView]} — portfolio beta`} value={`~${fmtNum(m.beta)}`} sub={`Equity sleeve ${m.equitySleeveBeta === null ? "—" : fmtNum(m.equitySleeveBeta)}`} provenance="estimated" />
        <Kpi label="Alpha-attribution proxy" value={fmtPP(m.alphaProxy)} provenance="estimated" href="/risk/attribution" />
        <Kpi label="Expected return / volatility" value={`${fmtRate(m.expectedReturn)} / ${fmtRate(m.volatility)}`} sub="Illustrative" provenance="assumption" href="/risk/scenarios" />
        <Kpi label="Equity-market stress −20%" value={fmtRate(m.beta * -20, 1, true)} sub={money((m.beta * -20 * m.value) / 100, { sign: true })} provenance="estimated" href="/risk/stress" />
      </div>

      <Panel title="All portfolios" description="The portfolio chosen at the top right of this page is highlighted.">
        <TableWrap>
          <thead>
            <tr>
              <Th>Metric</Th>
              <Th>Basis</Th>
              {KEYS.map((k) => (
                <Th key={k} align="right" className={k === state.portfolioView ? "text-slate-900" : undefined}>
                  {PORTFOLIO_LABELS[k]}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <Td>
                  <div className="text-slate-800">{r.label}</div>
                  {r.note && <div className="text-[11px] text-slate-500">{r.note}</div>}
                </Td>
                <Td>
                  <Provenance kind={r.prov} />
                </Td>
                {KEYS.map((k) => (
                  <Td key={k} align="right" className={k === state.portfolioView ? "bg-blue-50/50 font-semibold text-slate-900" : undefined}>
                    {r.get(model.byKey[k])}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      <Callout tone="neutral" title="Methodology limits">
        Beta and alpha are holdings-based: each fund&apos;s reported 3-year statistic weighted by portfolio weight. They are
        not a regression of the portfolio&apos;s own monthly returns on one benchmark. Volatility and expected return are
        illustrative, built from the §14.1 sleeve assumptions (editable in Scenarios). The definitive method — a monthly
        NAV series regressed on a documented blended benchmark over 36–60 months — remains open item O10.
      </Callout>
    </>
  )
}
