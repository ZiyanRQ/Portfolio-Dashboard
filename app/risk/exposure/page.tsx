"use client"

import { useState } from "react"

import { getFund } from "@/lib/data/funds"
import { SLEEVE_COLORS } from "@/lib/colors"
import { fmtPct } from "@/lib/format"
import { PORTFOLIO_LABELS, type PortfolioKey } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { StackBar } from "@/components/dashboard/charts"
import { CLASS_COLORS, CLASS_LABELS } from "@/components/dashboard/common"
import { Callout, NA, PageHeader, Panel, Provenance, Segmented, SelectField, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

type Scope = "portfolio" | "equity" | "fund"
const SECTORS = ["Financials", "IT", "Industrials", "Consumer", "Healthcare", "Energy", "Other sectors"]
const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]

export default function ExposurePage() {
  const { model, state, set } = useDashboard()
  const m = model.selected
  const [scope, setScope] = useState<Scope>("portfolio")
  const [fundId, setFundId] = useState<string>(m.positions[0]?.fund.id ?? "")
  const fund = scope === "fund" ? m.positions.find((p) => p.fund.id === fundId)?.fund ?? m.positions[0]?.fund : undefined

  // Denominator for the scope: whole portfolio, equity sleeve, or one fund (=1).
  const eq = m.equity || 1
  const scale = scope === "equity" ? 1 / eq : 1

  let large = 0
  let midSmall = 0
  let undisclosed = 0
  let foreign: number | null = null
  let foreignCoverage = 1
  if (scope === "fund" && fund) {
    if (fund.assetClass === "equity") {
      if (fund.midSmallPct === null) undisclosed = 1
      else {
        midSmall = fund.midSmallPct / 100
        large = 1 - midSmall
      }
    }
    foreign = fund.foreignPct === null ? null : fund.foreignPct / 100
  } else {
    large = m.marketCap.large * scale
    midSmall = m.marketCap.midSmall * scale
    undisclosed = m.marketCap.undisclosed * scale
    foreign = m.foreign.value * scale
    foreignCoverage = m.foreign.coverage
  }
  const coverage = scope === "fund" ? (undisclosed > 0 ? 0 : 1) : m.marketCap.coverage

  return (
    <>
      <PageHeader
        eyebrow="Risk & Performance · Exposure"
        title="Sector & exposure look-through"
        description="What the portfolio owns underneath its funds. The proposal does not include a full holdings look-through, so incomplete figures are labelled as such rather than filled in."
        actions={
          <>
            <Segmented<PortfolioKey>
              ariaLabel="Portfolio"
              value={state.portfolioView}
              onChange={(v) => set({ portfolioView: v })}
              options={KEYS.map((k) => ({ value: k, label: PORTFOLIO_LABELS[k] }))}
            />
            <Segmented<Scope>
              ariaLabel="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: "portfolio", label: "Entire portfolio" },
                { value: "equity", label: "Equity portfolio" },
                { value: "fund", label: "Individual fund" },
              ]}
            />
          </>
        }
      />

      {scope === "fund" && (
        <SelectField
          className="max-w-sm"
          label="Fund"
          value={fund?.id ?? ""}
          onChange={setFundId}
          options={m.positions.map((p) => ({ value: p.fund.id, label: p.fund.shortName }))}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Sector exposure"
          actions={<Provenance kind="na" label="Look-through incomplete" />}
          description={scope === "fund" && fund ? fund.shortName : scope === "equity" ? "Equity sleeve" : "Entire portfolio"}
        >
          <TableWrap>
            <thead>
              <tr>
                <Th>Sector</Th>
                <Th align="right">Weight</Th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map((s) => (
                <tr key={s}>
                  <Td>{s}</Td>
                  <Td align="right">
                    {s === "Financials" ? (
                      <span className="text-xs text-slate-600">Largest single sector (qualitative) — % not disclosed</span>
                    ) : (
                      <NA reason="Not available" />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="mt-3 text-xs text-slate-500">
            The proposal states that financials are the largest single-sector exposure across the candidate equity funds
            (Phase 3 flags, Figure 6) and that a full portfolio look-through is not computable from available holdings. Sector
            weights require AMC portfolio disclosures for each fund — none are reproduced in the proposal.
          </p>
        </Panel>

        <Panel
          title="Market-cap exposure"
          actions={<Provenance kind={coverage < 0.999 ? "na" : "measured"} label={`Coverage ${fmtPct(coverage, 0)}`} />}
          description={scope === "portfolio" ? "Share of the whole portfolio; non-equity shown separately" : scope === "equity" ? "Share of the equity sleeve" : fund?.shortName}
        >
          {scope === "fund" && fund && fund.assetClass !== "equity" ? (
            <p className="text-sm text-slate-600">Not an equity fund — no market-cap exposure.</p>
          ) : (
            <StackBar
              segments={[
                { key: "large", label: "Large cap (residual of disclosed mid/small)", value: large, color: "#2a78d6", display: fmtPct(large, 1) },
                { key: "mid", label: "Mid + small cap", value: midSmall, color: "#eb6834", display: fmtPct(midSmall, 1) },
                { key: "und", label: "Not disclosed", value: undisclosed, color: "#cbd5e1", display: fmtPct(undisclosed, 1) },
                ...(scope === "portfolio" ? [{ key: "non", label: "Non-equity", value: 1 - m.equity, color: "#e2e8f0", display: fmtPct(1 - m.equity, 1) }] : []),
              ]}
            />
          )}
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            <li>Disclosed: SBI Large &amp; Midcap ~50% mid/small; ABSL Flexi ~24%; Taurus Ethical ~55%; Nifty 50 = large caps by construction.</li>
            <li>Not disclosed in the proposal: Parag Parikh, ICICI Value, Tata Ethical and the bench funds.</li>
            <li>“Large cap” here is the residual after the disclosed mid/small share and may include cash or other holdings.</li>
          </ul>
        </Panel>

        <Panel title="Foreign, Sharia and fixed-income exposure">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                Foreign exposure <Provenance kind="measured" label={`Coverage ${fmtPct(scope === "fund" ? (foreign === null ? 0 : 1) : foreignCoverage, 0)}`} />
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{foreign === null ? <NA /> : fmtPct(foreign, 2)}</div>
              <div className="text-[11px] text-slate-500">Parag Parikh ~10.7% foreign sleeve → ~1.8% of the proposed portfolio</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Sharia-screened exposure</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {scope === "fund" && fund ? (fund.shariaStatus === "supervised" || fund.shariaStatus === "unverified" ? "100%" : "0%") : fmtPct(m.sharia * scale, 1)}
              </div>
              <div className="text-[11px] text-slate-500">
                {m.shariaUnverified > 0 ? `${fmtPct(m.shariaUnverified, 1)} with unconfirmed supervisor` : "Screened funds only; “ethical” ≠ Sharia"}
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Fixed-income + liquidity</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {scope === "fund" && fund ? (fund.assetClass === "equity" ? "0%" : "100%") : scope === "equity" ? "n/a" : fmtPct(m.fixedIncome + m.liquidity + m.baseTier, 1)}
              </div>
              <div className="text-[11px] text-slate-500">Debt funds, liquid funds and direct base-tier instruments</div>
            </div>
          </div>
          {scope === "portfolio" && (
            <div className="mt-4">
              <StackBar
                segments={(Object.keys(CLASS_COLORS) as (keyof typeof CLASS_COLORS)[]).map((k) => ({
                  key: k,
                  label: CLASS_LABELS[k],
                  value: m.byClass[k],
                  color: CLASS_COLORS[k],
                }))}
              />
            </div>
          )}
        </Panel>

        <Panel title="Exposure data coverage by holding" description="Which look-through fields the proposal discloses">
          <TableWrap>
            <thead>
              <tr>
                <Th>Holding</Th>
                <Th align="right">Weight</Th>
                <Th align="center">Sector</Th>
                <Th align="center">Mkt cap</Th>
                <Th align="center">Foreign</Th>
                <Th align="center">Credit</Th>
              </tr>
            </thead>
            <tbody>
              {m.positions.map((p) => {
                const f = getFund(p.fund.id)
                const eqf = f.assetClass === "equity"
                const yes = <StatusPill tone="green" icon={false}>Yes</StatusPill>
                const no = <StatusPill tone="neutral" icon={false}>No</StatusPill>
                const na = <span className="text-xs text-slate-400">n/a</span>
                return (
                  <tr key={p.key}>
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-[2px]" style={{ background: SLEEVE_COLORS[f.sleeve] }} />
                        {f.shortName}
                      </span>
                    </Td>
                    <Td align="right">{fmtPct(p.weight, 1)}</Td>
                    <Td align="center">{eqf ? no : na}</Td>
                    <Td align="center">{eqf ? (f.midSmallPct !== null ? yes : no) : na}</Td>
                    <Td align="center">{f.foreignPct !== null ? yes : no}</Td>
                    <Td align="center">{eqf ? na : f.credit && (f.credit.aaaSovereign !== null || f.credit.belowAAA !== null) ? yes : no}</Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        </Panel>
      </div>

      <Callout tone="neutral">
        To complete the look-through, load each fund&apos;s latest monthly portfolio disclosure (sector, market-cap and
        foreign holdings) — the model will aggregate them by weight automatically.
      </Callout>
    </>
  )
}
