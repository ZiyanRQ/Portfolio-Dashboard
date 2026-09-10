"use client"

import { PDF_FIGURES } from "@/lib/data/portfolio"
import { fmtNum, fmtPct, fmtPP } from "@/lib/format"
import { PORTFOLIO_LABELS, type PortfolioKey } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { ChartFrame, Waterfall } from "@/components/dashboard/charts"
import { FundButton } from "@/components/dashboard/common"
import { Callout, Formula, Kpi, NA, PageHeader, Panel, Segmented, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]

export default function AttributionPage() {
  const { model, state, set, openFund } = useDashboard()
  const m = model.selected
  const sorted = [...m.contributions].sort((a, b) => Math.abs(b.alphaContribution) - Math.abs(a.alphaContribution))
  const equityAlpha = m.contributions.filter((c) => c.fund.assetClass === "equity").reduce((s, c) => s + c.alphaContribution, 0)
  const otherAlpha = m.alphaProxy - equityAlpha

  const table = (
    <TableWrap>
      <thead>
        <tr>
          <Th>Holding</Th>
          <Th align="right">Weight</Th>
          <Th align="right">Alpha</Th>
          <Th align="right">Beta used</Th>
          <Th align="right">Alpha contrib.</Th>
          <Th align="right">Beta contrib.</Th>
          <Th>Basis</Th>
        </tr>
      </thead>
      <tbody>
        {m.contributions.map((c) => (
          <tr key={c.key}>
            <Td>
              <FundButton fund={c.fund} />
            </Td>
            <Td align="right">{fmtPct(c.weight, 1)}</Td>
            <Td align="right">{c.fund.alpha === null ? <NA /> : fmtPP(c.fund.alpha)}</Td>
            <Td align="right">
              {fmtNum(c.beta)}
              {c.fund.betaBenchmark === "debt" && <div className="text-[10px] text-slate-400">debt β {fmtNum(c.fund.beta ?? 0)} excluded</div>}
            </Td>
            <Td align="right">{fmtPP(c.alphaContribution, 3)}</Td>
            <Td align="right">{fmtNum(c.betaContribution, 3)}</Td>
            <Td>
              {c.pdfAssumed ? (
                <StatusPill tone="blue" icon={false}>PDF assumption</StatusPill>
              ) : c.placeholder ? (
                <StatusPill tone="amber" icon={false}>Placeholder</StatusPill>
              ) : c.fund.researchStatus === "instrument" ? (
                <StatusPill tone="neutral" icon={false}>Direct instrument</StatusPill>
              ) : (
                <StatusPill tone="green" icon={false}>Reported</StatusPill>
              )}
            </Td>
          </tr>
        ))}
        <tr className="font-semibold">
          <Td>Total</Td>
          <Td align="right">100%</Td>
          <Td />
          <Td />
          <Td align="right">{fmtPP(m.alphaProxy, 3)}</Td>
          <Td align="right">{fmtNum(m.beta, 3)}</Td>
          <Td />
        </tr>
      </tbody>
    </TableWrap>
  )

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Attribution"
        title="Alpha and beta attribution by fund"
        description="How each holding contributes to the portfolio's equity-market sensitivity and to the weighted alpha proxy."
        actions={
          <Segmented<PortfolioKey>
            ariaLabel="Portfolio"
            value={state.portfolioView}
            onChange={(v) => set({ portfolioView: v })}
            options={KEYS.map((k) => ({ value: k, label: PORTFOLIO_LABELS[k] }))}
          />
        }
      />

      <Callout tone="amber" title="The alpha figure is a holdings-based attribution proxy">
        It is the sum of each holding&apos;s weight times its reported 3-year Jensen alpha against <em>its own</em> stated
        benchmark. It is <strong>not</strong> a regression-based portfolio Jensen alpha, which needs a portfolio return
        series and one documented benchmark (open item O10). Beta likewise weights reported fund betas.
      </Callout>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Portfolio beta" value={fmtNum(m.beta, 3)} sub={<Formula>β ≈ Σ(wᵢ × βᵢ)</Formula>} provenance="estimated" />
        <Kpi label="Equity-sleeve beta" value={m.equitySleeveBeta === null ? "—" : fmtNum(m.equitySleeveBeta, 3)} sub={`= ${fmtNum(m.beta, 3)} ÷ ${fmtPct(m.equity, 1)} equity`} provenance="estimated" />
        <Kpi label="Alpha-attribution proxy" value={fmtPP(m.alphaProxy, 3)} sub={<Formula>α ≈ Σ(wᵢ × αᵢ)</Formula>} provenance="estimated" />
        <Kpi label="Alpha split" value={`${fmtPP(equityAlpha, 3)} / ${fmtPP(otherAlpha, 3)}`} sub="Equity / debt + liquidity" provenance="estimated" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Alpha contribution (waterfall)" description="Blue adds, red subtracts. Click a bar for the fund profile.">
          <Waterfall
            rows={sorted.map((c) => ({
              key: c.key,
              label: c.fund.shortName,
              value: c.alphaContribution,
              note: c.placeholder ? "placeholder" : c.pdfAssumed ? "assumed" : undefined,
              muted: c.placeholder,
              onClick: () => openFund(c.fund.id),
            }))}
            totalLabel="Alpha proxy"
            format={(v) => fmtPP(v, 3)}
          />
        </Panel>
        <Panel title="Beta contribution (waterfall)" description="Debt and liquid funds carry ~0 equity-market beta.">
          <Waterfall
            rows={[...m.contributions]
              .sort((a, b) => b.betaContribution - a.betaContribution)
              .map((c) => ({
                key: c.key,
                label: c.fund.shortName,
                value: c.betaContribution,
                note: c.placeholder ? "placeholder" : c.pdfAssumed ? "assumed" : undefined,
                muted: c.placeholder,
                onClick: () => openFund(c.fund.id),
              }))}
            totalLabel="Portfolio beta"
            format={(v) => fmtNum(v, 3)}
          />
        </Panel>
      </div>

      <Panel title="Contribution table">
        <ChartFrame chart={table} table={table} />
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <p>
            Reconciliation: the PDF reports proposed beta {PDF_FIGURES.proposedBeta}, equity-sleeve beta {PDF_FIGURES.proposedSleeveBeta}
            , alpha +{PDF_FIGURES.proposedAlpha}pp; current beta {PDF_FIGURES.currentBeta} and alpha +{PDF_FIGURES.currentAlpha}pp.
            The recommended portfolio reproduces these figures exactly.
          </p>
          <p>
            Debt-fund betas (ICICI Corporate Bond 0.90, HDFC Short Duration 1.16, ICICI Liquid 1.64) are against debt
            benchmarks and are deliberately not added to equity beta. Mechanically averaging every beta gives ~0.92 — a
            number with no coherent market interpretation.
          </p>
          {m.placeholders.length > 0 && (
            <p className="text-amber-800">
              Placeholder values (equity beta 1.00, alpha 0 — the PDF&apos;s own convention for an unmeasured tracker) are used
              for: {m.placeholders.join(", ")}. Treat totals as incomplete.
            </p>
          )}
        </div>
      </Panel>
    </>
  )
}
