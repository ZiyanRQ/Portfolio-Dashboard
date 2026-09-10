"use client"

import { useState } from "react"

import { PORTFOLIO_COLORS } from "@/lib/colors"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { PORTFOLIO_LABELS, type Metrics } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { StackBar } from "@/components/dashboard/charts"
import { classSegments, sleeveSegments, STRESS_SCENARIOS } from "@/components/dashboard/common"
import { Delta, PageHeader, Panel, Provenance, Segmented, Swatch, type ProvenanceKind } from "@/components/dashboard/ui"

type View = "current" | "proposed" | "difference"
type Target = "proposed" | "fallback"

interface Row {
  key: string
  label: string
  get: (m: Metrics) => number
  fmt: (v: number) => string
  diff: (d: number) => string
  goodWhen: "up" | "down" | "none"
  provenance: ProvenanceKind
  note?: string
}

export default function ComparisonPage() {
  const { model, money } = useDashboard()
  const [view, setView] = useState<View>("difference")
  const [target, setTarget] = useState<Target>("proposed")
  const cur = model.current
  const tgt = model.byKey[target]
  const pp = (d: number) => fmtPP(d * 100, 1)

  const rows: Row[] = [
    { key: "equity", label: "Equity allocation", get: (m) => m.equity, fmt: (v) => fmtPct(v), diff: pp, goodWhen: "none", provenance: "calculated" },
    { key: "fi", label: "Fixed income (incl. base tier)", get: (m) => m.fixedIncome + m.baseTier, fmt: (v) => fmtPct(v), diff: pp, goodWhen: "none", provenance: "calculated" },
    { key: "liq", label: "Liquidity", get: (m) => m.liquidity, fmt: (v) => fmtPct(v), diff: pp, goodWhen: "up", provenance: "calculated" },
    { key: "meaningful", label: "Meaningful holdings (≥ 2%)", get: (m) => m.meaningful, fmt: (v) => String(v), diff: (d) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)}`, goodWhen: "up", provenance: "calculated" },
    { key: "largest", label: "Largest holding", get: (m) => m.largest?.weight ?? 0, fmt: (v) => fmtPct(v), diff: pp, goodWhen: "down", provenance: "calculated" },
    { key: "top5", label: "Top-5 concentration", get: (m) => m.top5, fmt: (v) => fmtPct(v), diff: pp, goodWhen: "down", provenance: "calculated", note: "PDF prints 65% for the proposal — that is the top-5 equity holdings (R3)" },
    { key: "hhi", label: "HHI", get: (m) => m.hhi, fmt: (v) => Math.round(v).toLocaleString("en-IN"), diff: (d) => `${d > 0 ? "+" : "−"}${Math.abs(Math.round(d)).toLocaleString("en-IN")}`, goodWhen: "down", provenance: "calculated" },
    { key: "beta", label: "Portfolio beta (equity market)", get: (m) => m.beta, fmt: (v) => fmtNum(v), diff: (d) => fmtNum(d, 2), goodWhen: "down", provenance: "estimated" },
    { key: "alpha", label: "Alpha-attribution proxy", get: (m) => m.alphaProxy, fmt: (v) => fmtPP(v), diff: (d) => fmtPP(d), goodWhen: "up", provenance: "estimated", note: "Current alpha is before the Regular-plan fee drag" },
    { key: "er", label: "Expected return (net)", get: (m) => m.expectedReturn, fmt: (v) => fmtRate(v), diff: (d) => fmtPP(d, 1), goodWhen: "up", provenance: "assumption", note: "Same illustrative assumptions for both; the PDF prints “—” for current" },
    { key: "vol", label: "Estimated volatility", get: (m) => m.volatility, fmt: (v) => fmtRate(v), diff: (d) => fmtPP(d, 1), goodWhen: "down", provenance: "assumption" },
    { key: "regular", label: "Regular-plan exposure", get: (m) => m.regularWeight, fmt: (v) => fmtPct(v, 0), diff: pp, goodWhen: "down", provenance: "measured" },
    { key: "fees", label: "Estimated annual fees", get: (m) => m.annualFees, fmt: (v) => money(v), diff: (d) => money(d, { sign: true }), goodWhen: "down", provenance: "assumption" },
    { key: "stress", label: "Stress: equities −20% (beta)", get: (m) => (m.beta * -20 * m.value) / 100, fmt: (v) => money(v), diff: (d) => money(d, { sign: true }), goodWhen: "up", provenance: "estimated" },
    { key: "c619", label: "Circular 619 tier (in portfolio)", get: (m) => m.c619, fmt: (v) => fmtPct(v, 0), diff: pp, goodWhen: "down", provenance: "calculated" },
  ]

  const feeSaving = cur.annualFees - tgt.annualFees

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Comparison"
        title="Current vs proposed"
        description="Before-and-after on every dimension the proposal measures. Toggle the figure shown; the paired bars always show both portfolios."
        actions={
          <>
            <Segmented<Target>
              ariaLabel="Compare with"
              value={target}
              onChange={setTarget}
              options={[
                { value: "proposed", label: "vs Proposed" },
                { value: "fallback", label: "vs Compliance fallback" },
              ]}
            />
            <Segmented<View>
              ariaLabel="Figure shown"
              value={view}
              onChange={setView}
              options={[
                { value: "current", label: "Current" },
                { value: "proposed", label: PORTFOLIO_LABELS[target] },
                { value: "difference", label: "Difference" },
              ]}
            />
          </>
        }
      />

      <Panel
        title="Metric comparison"
        actions={
          <div className="flex gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Swatch color={PORTFOLIO_COLORS.current} /> Current
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Swatch color={target === "proposed" ? PORTFOLIO_COLORS.proposed : PORTFOLIO_COLORS.fallback} /> {PORTFOLIO_LABELS[target]}
            </span>
          </div>
        }
      >
        <div className="divide-y divide-slate-100">
          {rows.map((r) => {
            const a = r.get(cur)
            const b = r.get(tgt)
            const scale = Math.max(Math.abs(a), Math.abs(b), 1e-9)
            return (
              <div key={r.key} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 py-2 sm:grid-cols-[16rem_1fr_9rem]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm text-slate-800">
                    {r.label} <Provenance kind={r.provenance} />
                  </div>
                  {r.note && <div className="text-[11px] text-slate-500">{r.note}</div>}
                </div>
                <div className="space-y-[2px]" title={`Current ${r.fmt(a)} · ${PORTFOLIO_LABELS[target]} ${r.fmt(b)}`}>
                  <div className="h-2 rounded-r-[3px] transition-[width] duration-300" style={{ width: `${(Math.abs(a) / scale) * 100}%`, background: PORTFOLIO_COLORS.current }} />
                  <div
                    className="h-2 rounded-r-[3px] transition-[width] duration-300"
                    style={{ width: `${(Math.abs(b) / scale) * 100}%`, background: target === "proposed" ? PORTFOLIO_COLORS.proposed : PORTFOLIO_COLORS.fallback }}
                  />
                </div>
                <div className="text-right text-sm">
                  {view === "difference" ? (
                    <Delta value={b - a} display={Math.abs(b - a) < 1e-9 ? "No change" : r.diff(b - a)} goodWhen={r.goodWhen} />
                  ) : (
                    <span className="font-semibold text-slate-900 tabular-nums">{r.fmt(view === "current" ? a : b)}</span>
                  )}
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {r.fmt(a)} → {r.fmt(b)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Sharpe, Sortino and maximum drawdown: <span className="italic">not computed</span> for either portfolio — they need
          a portfolio return / covariance series (O10).
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Allocation — before and after" description="By portfolio role and by asset class">
          <div className="space-y-4">
            {[
              ["Current", cur],
              [PORTFOLIO_LABELS[target], tgt],
            ].map(([label, m]) => (
              <div key={label as string} className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">{label as string}</div>
                <StackBar segments={sleeveSegments(m as Metrics)} height={18} />
                <StackBar segments={classSegments(m as Metrics)} height={10} legend={false} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Stress-test losses" description="Portfolio impact — percentage and money">
          <div className="space-y-3">
            {STRESS_SCENARIOS.map((s) => {
              const a = s.run(cur)
              const b = s.run(tgt)
              const scale = Math.max(Math.abs(a), Math.abs(b), 0.5)
              return (
                <div key={s.key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{s.label}</span>
                    <span className="text-slate-400">{s.method}</span>
                  </div>
                  {[
                    ["Current", a, PORTFOLIO_COLORS.current, cur.value],
                    [PORTFOLIO_LABELS[target], b, target === "proposed" ? PORTFOLIO_COLORS.proposed : PORTFOLIO_COLORS.fallback, tgt.value],
                  ].map(([label, v, color, value]) => (
                    <div key={label as string} className="flex items-center gap-2 py-0.5">
                      <span className="w-28 shrink-0 truncate text-[11px] text-slate-500">{label as string}</span>
                      <div className="h-3 min-w-0 flex-1">
                        <div
                          className="h-full rounded-r-[3px] transition-[width] duration-300"
                          style={{ width: `${(Math.abs(v as number) / scale) * 100}%`, background: color as string }}
                        />
                      </div>
                      <span className="w-40 shrink-0 text-right text-xs font-medium text-slate-900 tabular-nums">
                        {fmtRate(v as number, 1, true)} · {money(((v as number) / 100) * (value as number), { sign: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Regular vs Direct costs" description="Assumption-based: blended Direct-plan cost plus the Regular-plan differential">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Current annual fees (all Regular)</div>
            <div className="text-lg font-semibold text-slate-900">{money(cur.annualFees)}</div>
            <div className="text-xs text-slate-500">{fmtRate(cur.feePct, 2)} of assets</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{PORTFOLIO_LABELS[target]} annual fees (Direct)</div>
            <div className="text-lg font-semibold text-slate-900">{money(tgt.annualFees)}</div>
            <div className="text-xs text-slate-500">{fmtRate(tgt.feePct, 2)} of assets</div>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-800">Estimated annual fee saving</div>
            <div className="text-lg font-semibold text-emerald-900">{money(feeSaving)}</div>
            <div className="text-xs text-emerald-800">PDF prints ~₹6–7 L — see reconciliation R1</div>
          </div>
        </div>
      </Panel>
    </>
  )
}
