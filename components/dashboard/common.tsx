"use client"

import type { Fund } from "@/lib/data/funds"
import { LIMITS, RECOMMENDED_SLOTS } from "@/lib/data/portfolio"
import { SLEEVE_COLORS, SLEEVE_LABELS, SLEEVE_ORDER } from "@/lib/colors"
import { fmtPct } from "@/lib/format"
import {
  equityShock,
  largestHoldingShock,
  rateShock,
  type ComplianceTone,
  type Metrics,
} from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Segment } from "@/components/dashboard/charts"
import { StatusPill, type Tone } from "@/components/dashboard/ui"

export const CLASS_COLORS = {
  equity: "#2a78d6",
  "fixed-income": "#e87ba4",
  liquidity: "#008300",
  "base-tier": "#4a3aa7",
} as const

export const CLASS_LABELS = {
  equity: "Equity",
  "fixed-income": "Fixed income (debt funds)",
  liquidity: "Liquidity",
  "base-tier": "Base tier (direct G-Sec / FD)",
} as const

export function sleeveSegments(m: Metrics): Segment[] {
  return SLEEVE_ORDER.map((s) => ({
    key: s,
    label: SLEEVE_LABELS[s],
    value: m.bySleeve[s],
    color: SLEEVE_COLORS[s],
    display: fmtPct(m.bySleeve[s], m.bySleeve[s] < 0.1 ? 1 : 0),
  }))
}

export function classSegments(m: Metrics): Segment[] {
  return (Object.keys(CLASS_COLORS) as (keyof typeof CLASS_COLORS)[]).map((k) => ({
    key: k,
    label: CLASS_LABELS[k],
    value: m.byClass[k],
    color: CLASS_COLORS[k],
    display: fmtPct(m.byClass[k], m.byClass[k] < 0.1 ? 1 : 0),
  }))
}

export function clauseLabel(f: Fund) {
  if (f.regTier === "base") return "Base tier"
  const m = f.gate1Basis.match(/clause \(([a-i])\)/)
  return m ? `C619 · clause (${m[1]})` : "C619 tier"
}

export function toneOf(t: ComplianceTone): Tone {
  return t
}

export function FundButton({ fund, className, label }: { fund: Fund; className?: string; label?: string }) {
  const { openFund } = useDashboard()
  return (
    <button
      type="button"
      onClick={() => openFund(fund.id)}
      className={cn(
        "text-left font-medium text-slate-900 underline-offset-2 hover:text-blue-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none",
        className
      )}
    >
      {label ?? fund.shortName}
    </button>
  )
}

export const STRESS_SCENARIOS: { key: string; label: string; method: string; run: (m: Metrics) => number }[] = [
  { key: "eq10-1", label: "Equities −10% (1:1 ceiling)", method: "Equity weight × shock", run: (m) => equityShock(m, -10, "one-to-one") },
  { key: "eq10-b", label: "Equities −10% (beta-adjusted)", method: "Portfolio equity beta × shock", run: (m) => equityShock(m, -10, "beta") },
  { key: "eq20-b", label: "Equities −20% (beta-adjusted)", method: "Portfolio equity beta × shock", run: (m) => equityShock(m, -20, "beta") },
  { key: "eq35-b", label: "Severe drawdown −35% (beta)", method: "Portfolio equity beta × shock", run: (m) => equityShock(m, -35, "beta") },
  { key: "largest", label: "Largest holding −30%", method: "Largest weight × shock", run: (m) => largestHoldingShock(m, -30) },
  { key: "rates-up", label: "Rates +1%", method: "−Duration × Δyield on debt", run: (m) => rateShock(m, 1) },
  { key: "rates-down", label: "Rates −1%", method: "Symmetric", run: (m) => rateShock(m, -1) },
]

const RECOMMENDED_SLEEVE = (() => {
  // Sleeve totals of the printed proposal, for the ±5 pp band test.
  const eq = RECOMMENDED_SLOTS.slice(0, 6).reduce((s, x) => s + x.weight, 0)
  return { equity: eq / 100, fixedIncome: 0.24, liquidity: 0.06 }
})()

export interface LimitCheck {
  key: string
  label: string
  value: string
  tone: Tone
  note: string
}

export function limitChecks(m: Metrics, slotsTotal?: number): LimitCheck[] {
  const checks: LimitCheck[] = []
  if (slotsTotal !== undefined) {
    const ok = Math.abs(slotsTotal - 100) < 0.01
    checks.push({
      key: "sum",
      label: "Weights sum to 100%",
      value: `${slotsTotal.toFixed(2)}%`,
      tone: ok ? "green" : "red",
      note: ok ? "Fully allocated" : "Metrics are shown on weights normalised to 100%",
    })
  }
  const largest = m.largest?.weight ?? 0
  checks.push({
    key: "max",
    label: `Max position ≤ ${LIMITS.maxPosition}%`,
    value: `${m.largest?.fund.shortName ?? "—"} ${fmtPct(largest)}`,
    tone: largest > LIMITS.maxPosition / 100 + 1e-9 ? "red" : largest > (LIMITS.maxPosition - 3) / 100 ? "amber" : "green",
    note: "§21 hard limit per fund",
  })
  checks.push({
    key: "top5",
    label: `Top-5 ≤ ${LIMITS.top5Trigger}%`,
    value: fmtPct(m.top5),
    tone: m.top5 > LIMITS.top5Trigger / 100 + 1e-9 ? "red" : m.top5 > (LIMITS.top5Trigger - 3) / 100 ? "amber" : "green",
    note: "§20 trim trigger",
  })
  const topAmc = m.amc[0]
  if (topAmc) {
    checks.push({
      key: "amc",
      label: `Single AMC ≤ ~${LIMITS.amcGuideline}%`,
      value: `${topAmc.amc} ${fmtPct(topAmc.weight)}`,
      tone: topAmc.weight > LIMITS.amcGuideline / 100 + 1e-9 ? "amber" : "green",
      note: "§21 — above this needs a recorded rationale",
    })
  }
  const bands: [string, number, number][] = [
    ["Equity sleeve", m.equity, RECOMMENDED_SLEEVE.equity],
    ["Income sleeve", m.fixedIncome, RECOMMENDED_SLEEVE.fixedIncome],
    ["Liquidity sleeve", m.liquidity, RECOMMENDED_SLEEVE.liquidity],
  ]
  for (const [label, v, target] of bands) {
    const diff = Math.abs(v - target)
    checks.push({
      key: label,
      label: `${label} within ±${LIMITS.sleeveBand} pp`,
      value: `${fmtPct(v)} vs ${fmtPct(target, 0)}`,
      tone: diff > LIMITS.sleeveBand / 100 + 1e-9 ? "amber" : "green",
      note: "§21 tolerance band vs the printed target",
    })
  }
  return checks
}

export function LimitList({ checks }: { checks: LimitCheck[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {checks.map((c) => (
        <li key={c.key} className="flex items-center justify-between gap-3 py-1.5">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-800">{c.label}</div>
            <div className="text-[11px] text-slate-500">{c.note}</div>
          </div>
          <StatusPill tone={c.tone}>{c.value}</StatusPill>
        </li>
      ))}
    </ul>
  )
}
