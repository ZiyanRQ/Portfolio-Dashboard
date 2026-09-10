"use client"

import { CURRENT_HOLDINGS, REPORTED_UNREALISED_GAIN, REPORTED_UNREALISED_GAIN_PCT, SOCIETY, LIMITS } from "@/lib/data/portfolio"
import { getFund } from "@/lib/data/funds"
import { SLEEVE_COLORS } from "@/lib/colors"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { useAuth } from "@/lib/auth-client"
import { useDashboard } from "@/lib/store"
import { HBars, StackBar, Waterfall } from "@/components/dashboard/charts"
import { classSegments, clauseLabel, FundButton } from "@/components/dashboard/common"
import { fundAction } from "@/components/dashboard/fund-sheet"
import { Kpi, NA, PageHeader, Panel, Provenance, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const DIAGNOSIS = [
  ["Concentration", "Two equity funds are 99.6% of the book; effective number of funds ≈ 2. Largest single holding 51.0%."],
  ["Fund overlap", "Both are large-cap-anchored Indian equity with 0.85+ return correlation — one exposure held twice, plus a cost drag."],
  ["Market-cap / style", "SBI Large & Midcap forces ~50% mid/small; ABSL Flexi ~24% — a mid-cap tilt heavier than it looks."],
  ["Liquidity", "0.4% — inadequate against a school's fee cycle and monthly payroll (B14)."],
  ["Credit / duration", "Negligible — the mirror image of having no stable sleeve at all."],
  ["Sector", "Not fully computable from available look-through; both funds are financials-heavy in line with the index."],
  ["Risk-adjusted performance", "Not computable at portfolio level from available evidence (§22)."],
  ["Sharia exposure", "0% — no screening applied in the current book."],
] as const

export default function CurrentPortfolioPage() {
  const { model, money, state, openFund } = useDashboard()
  const { identity } = useAuth()
  const m = model.current
  const a = state.assumptions
  const feeDrag = (m.value * m.regularWeight * a.regularPremium) / 100

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Current"
        title="The existing portfolio"
        description={`Reconstructed from ${identity.statementSource} dated ${SOCIETY.statementDate}. All holdings are Regular-Growth. ${identity.relatedEntity} is a separate legal entity and is excluded (B12).`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Market value" value={money(m.value)} provenance="measured" />
        <Kpi label="Unrealised gain (equity)" value={money(REPORTED_UNREALISED_GAIN, { sign: true })} sub={`+${REPORTED_UNREALISED_GAIN_PCT}% on the equity book`} provenance="measured" />
        <Kpi label="Equity / liquidity" value={`${fmtPct(m.equity)} / ${fmtPct(m.liquidity)}`} provenance="measured" tone="red" />
        <Kpi label="Portfolio beta" value={`~${fmtNum(m.beta)}`} sub="Σ weight × fund beta" provenance="estimated" />
        <Kpi label="Alpha proxy" value={`${fmtPP(m.alphaProxy)}*`} sub="Before Regular-plan fee drag" provenance="estimated" />
        <Kpi label="HHI / effective N" value={`${Math.round(m.hhi)} / ${fmtNum(m.effectiveN, 1)}`} sub="Concentration" provenance="calculated" tone="red" />
      </div>

      <Panel title="Holdings" description="Click a fund to open its profile — performance, risk, role, legal classification and proposed action.">
        <TableWrap>
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th align="right">Market value</Th>
              <Th align="right">Weight</Th>
              <Th align="right">Unrealised gain</Th>
              <Th align="right">IRR</Th>
              <Th>Asset class</Th>
              <Th>Plan</Th>
              <Th align="right">Alpha</Th>
              <Th align="right">Beta</Th>
              <Th>Regulatory tier</Th>
              <Th>Recommended action</Th>
            </tr>
          </thead>
          <tbody>
            {CURRENT_HOLDINGS.map((h) => {
              const f = getFund(h.fundId)
              const p = m.positions.find((x) => x.fund.id === h.fundId)
              const act = fundAction(f, model)
              return (
                <tr key={h.fundId} className="hover:bg-slate-50/70">
                  <Td>
                    <FundButton fund={f} />
                    <div className="text-xs text-slate-500">{f.category}</div>
                  </Td>
                  <Td align="right">{money(h.value, { compact: false })}</Td>
                  <Td align="right">{fmtPct(p?.weight ?? 0, 2)}</Td>
                  <Td align="right">
                    {h.unrealisedGain === null ? (
                      <NA reason="Not reported" />
                    ) : (
                      <>
                        {money(h.unrealisedGain, { sign: true })}
                        <div className="text-xs text-slate-500">{fmtRate(h.unrealisedGainPct ?? 0, 2, true)}</div>
                      </>
                    )}
                  </Td>
                  <Td align="right">
                    {fmtRate(h.irr, 2)}
                    {h.irrVsBenchmark !== null && <div className="text-xs text-slate-500">{fmtPP(h.irrVsBenchmark)} vs bmk</div>}
                  </Td>
                  <Td>{f.assetClass === "equity" ? "Equity" : "Liquidity"}</Td>
                  <Td>
                    <StatusPill tone="amber" icon={false}>Regular</StatusPill>
                  </Td>
                  <Td align="right">{f.alpha === null ? <NA /> : fmtPP(f.alpha)}</Td>
                  <Td align="right">{f.beta === null ? <NA /> : fmtNum(f.beta)}</Td>
                  <Td className="text-xs">{clauseLabel(f)}</Td>
                  <Td>
                    <StatusPill tone={act.tone}>{act.label}</StatusPill>
                  </Td>
                </tr>
              )
            })}
            <tr className="font-semibold">
              <Td>Total</Td>
              <Td align="right">{money(m.value, { compact: false })}</Td>
              <Td align="right">100%</Td>
              <Td align="right">{money(REPORTED_UNREALISED_GAIN, { sign: true })}</Td>
              <Td />
              <Td />
              <Td />
              <Td align="right">{fmtPP(m.alphaProxy)}*</Td>
              <Td align="right">{fmtNum(m.beta)}</Td>
              <Td className="text-xs">100% C619 tier</Td>
              <Td />
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-xs text-slate-500">
          * Alpha uses the research-file fund alphas although the present holdings are Regular plans, so it overstates
          current net alpha by the Regular-vs-Direct fee drag; shown only as a like-for-like proxy. ABSL Liquid alpha/beta
          are not disclosed and contribute zero. Per-fund gains sum to ₹1,21,15,529 (₹1 rounding in the statement).
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Allocation & concentration" description={`Weights against the ${LIMITS.maxPosition}% maximum position size (§21).`}>
          <HBars
            rows={m.sorted.map((p) => ({
              key: p.key,
              label: p.fund.shortName,
              value: p.weight,
              display: fmtPct(p.weight, 1),
              color: SLEEVE_COLORS[p.fund.sleeve],
              onClick: () => openFund(p.fund.id),
            }))}
            max={0.6}
            refLines={[{ value: LIMITS.maxPosition / 100, label: `${LIMITS.maxPosition}% max position`, tone: "red" }]}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-slate-500">Largest</div>
              <div className="text-base font-semibold text-slate-900">{fmtPct(m.largest?.weight ?? 0)}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-slate-500">Top-2</div>
              <div className="text-base font-semibold text-slate-900">{fmtPct(m.sorted.slice(0, 2).reduce((s, p) => s + p.weight, 0))}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <div className="text-slate-500">Effective N</div>
              <div className="text-base font-semibold text-slate-900">{fmtNum(m.effectiveN, 2)}</div>
            </div>
          </div>
        </Panel>

        <Panel title="Equity vs liquidity" description="Asset-class split and plan type">
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-700">Asset class</div>
              <StackBar segments={classSegments(m)} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Regular vs Direct plan exposure</span>
                <Provenance kind="assumption" label="Fee drag assumption-based" />
              </div>
              <StackBar
                segments={[
                  { key: "regular", label: "Regular plans", value: m.regularWeight, color: "#eb6834", display: fmtPct(m.regularWeight, 0) },
                  { key: "direct", label: "Direct plans", value: 1 - m.regularWeight, color: "#2a78d6", display: fmtPct(1 - m.regularWeight, 0) },
                ]}
              />
              <p className="mt-2 text-xs text-slate-600">
                Avoidable cost at a {a.regularPremium}% TER differential: <strong>{money(feeDrag)}</strong> a year.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Beta contribution" description="Equity-market beta = Σ(weight × fund beta); liquid fund ≈ 0.">
          <Waterfall
            rows={m.contributions.map((c) => ({
              key: c.key,
              label: c.fund.shortName,
              value: c.betaContribution,
              note: c.fund.beta === null ? "n/a" : `β ${fmtNum(c.fund.beta)}`,
              onClick: () => openFund(c.fund.id),
            }))}
            totalLabel="Portfolio beta"
            format={(v) => fmtNum(v, 3)}
          />
        </Panel>

        <Panel title="Alpha contribution" description="Weighted alpha-attribution proxy = Σ(weight × reported 3-yr Jensen alpha).">
          <Waterfall
            rows={m.contributions.map((c) => ({
              key: c.key,
              label: c.fund.shortName,
              value: c.alphaContribution,
              note: c.fund.alpha === null ? "n/a" : `α ${fmtPP(c.fund.alpha)}`,
              onClick: () => openFund(c.fund.id),
            }))}
            totalLabel="Alpha proxy*"
            format={(v) => fmtPP(v, 3)}
          />
        </Panel>
      </div>

      <Panel title="Investment diagnosis" description="Section 8">
        <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {DIAGNOSIS.map(([k, v]) => (
            <div key={k} className="border-l-2 border-slate-200 pl-3">
              <dt className="text-xs font-semibold text-slate-900">{k}</dt>
              <dd className="text-sm text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </>
  )
}
