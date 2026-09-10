"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, ChevronRight } from "lucide-react"

import { RECONCILIATION_FLAGS } from "@/lib/data/governance"
import { PORTFOLIO_VALUE, SOCIETY } from "@/lib/data/portfolio"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { buildFallback, buildFromSlots, computeMetrics } from "@/lib/model"
import { useAuth } from "@/lib/auth-client"
import { useDashboard } from "@/lib/store"
import { CapacityGauge, StackBar } from "@/components/dashboard/charts"
import { sleeveSegments } from "@/components/dashboard/common"
import { Callout, Kpi, PageHeader, Panel, ProvenanceLegend, StatusPill } from "@/components/dashboard/ui"

const STORY = [
  { label: "Current problem", href: "/portfolio/current" },
  { label: "Proposed portfolio", href: "/portfolio/proposed" },
  { label: "Improvement", href: "/portfolio/comparison" },
  { label: "Risk", href: "/risk/metrics" },
  { label: "Legal compliance", href: "/legal/framework" },
  { label: "Trustee decision", href: "/governance/decisions" },
  { label: "Implementation", href: "/implementation/plan" },
  { label: "Ongoing governance", href: "/governance/calendar" },
]

export default function OverviewPage() {
  const { model, state, money } = useDashboard()
  const { identity } = useAuth()
  const a = state.assumptions
  const { current: cur, proposed: pro, compliance: comp } = model

  // "If B17 is not confirmed" is always evaluated at zero qualifying assets elsewhere.
  const unconfirmed = useMemo(() => {
    const fb = buildFallback(buildFromSlots(state.slots), 0, a)
    return { info: fb, metrics: computeMetrics(fb.positions, a) }
  }, [state.slots, a])

  const b17Status = state.assumptionReg.B17?.status ?? "Unconfirmed"
  const breakeven = comp.proposed.breakeven
  const b17Met = state.b17 >= breakeven - 1
  const feeSaving = (cur.value * cur.regularWeight * a.regularPremium) / 100

  return (
    <>
      <PageHeader
        eyebrow="Executive overview"
        title="Investment & portfolio restructuring — trustee summary"
        description={
          <>
            {identity.name} holds a {money(PORTFOLIO_VALUE)} securities portfolio in two Regular-plan equity funds. The
            proposal moves it to a diversified, Direct-plan Core Growth 70/30 allocation inside the two-gate legal
            framework — conditional on one unconfirmed fact (B17).
          </>
        }
      />

      <nav aria-label="Story" className="overflow-x-auto">
        <ol className="flex min-w-max items-center gap-1 text-xs">
          {STORY.map((s, i) => (
            <li key={s.href} className="flex items-center gap-1">
              <Link
                href={s.href}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
              >
                <span className="mr-1 text-slate-400 tabular-nums">{i + 1}</span>
                {s.label}
              </Link>
              {i < STORY.length - 1 && <ChevronRight className="size-3.5 text-slate-300" />}
            </li>
          ))}
        </ol>
      </nav>

      {/* Trustee decision */}
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-5 py-3 text-white">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Trustee decision</div>
            <div className="text-lg font-semibold">
              Recommended portfolio: Core Growth 70/30
              {model.modified && <span className="ml-2 text-xs font-normal text-amber-300">(modified in the builder)</span>}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-2.5 py-1 text-xs font-semibold text-slate-900">
            Recommended — subject to confirmation
          </span>
        </div>
        <div className="grid gap-px bg-slate-200 lg:grid-cols-3">
          <div className="space-y-2 bg-white p-5">
            <div className="text-xs font-semibold tracking-wide text-red-700 uppercase">Critical dependency — B17</div>
            <p className="text-sm text-slate-700">
              Confirmation that the Society holds qualifying <strong>base-tier assets</strong> (bank deposits, G-Secs,
              T-Bills) of at least <strong>{money(breakeven)}</strong> outside this portfolio.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusPill tone={b17Status === "Confirmed" ? "green" : "red"}>B17 {b17Status.toLowerCase()}</StatusPill>
              <span className="text-slate-500">Value entered in simulator: {money(state.b17)}</span>
            </div>
            <Link href="/legal/b17" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
              Open the B17 simulator <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              If B17 is confirmed
              {b17Met && <StatusPill tone="green">Matches your input</StatusPill>}
            </div>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>Hold the allocation 100% in Direct-Growth funds ({pro.positions.length} holdings).</li>
              <li>
                Circular 619 utilisation at breakeven: {fmtPct(a.workingCeiling / 100, 0)} of total trust money — at the
                working ceiling, inside the 50% legal limit.
              </li>
              <li>
                Equity {fmtPct(pro.equity, 0)} · beta {fmtNum(pro.beta)} · expected return ~{fmtRate(pro.expectedReturn)} (illustrative).
              </li>
              <li>No migration into the base tier is required.</li>
            </ul>
          </div>
          <div className="space-y-2 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-700 uppercase">
              If B17 is not confirmed
              {!b17Met && <StatusPill tone="amber">Matches your input</StatusPill>}
            </div>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>
                Adopt the compliance fallback: scale the fund sleeve to {fmtPct(unconfirmed.info.fundShare, 0)} (
                {money(unconfirmed.info.fundShare * PORTFOLIO_VALUE)}).
              </li>
              <li>
                Place <strong>{money(unconfirmed.info.migration)}</strong> in a direct G-Sec/SDL ladder and scheduled-bank
                FD ladder.
              </li>
              <li>
                Equity falls to {fmtPct(unconfirmed.metrics.equity, 1)}; beta {fmtNum(unconfirmed.metrics.beta)}; expected
                return ~{fmtRate(unconfirmed.metrics.expectedReturn)} (illustrative).
              </li>
              <li>Fund choices and their relative weights are unchanged.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Total portfolio value" value={money(PORTFOLIO_VALUE)} sub={`Statement ${SOCIETY.statementDate}`} provenance="measured" />
        <Kpi label="Current equity allocation" value={fmtPct(cur.equity)} sub="Two equity funds" provenance="measured" tone="red" href="/portfolio/current" />
        <Kpi label="Proposed equity allocation" value={fmtPct(pro.equity, 0)} sub={`Income ${fmtPct(pro.fixedIncome, 0)} · liquidity ${fmtPct(pro.liquidity, 0)}`} provenance="calculated" href="/portfolio/proposed" />
        <Kpi label="Current liquidity" value={fmtPct(cur.liquidity)} sub={money(cur.liquidity * cur.value)} provenance="measured" tone="red" href="/risk/liquidity" />
        <Kpi label="Proposed liquidity" value={fmtPct(pro.liquidity, 0)} sub={money(pro.liquidity * pro.value)} provenance="calculated" href="/risk/liquidity" />
        <Kpi label="Current portfolio beta" value={`~${fmtNum(cur.beta)}`} sub="Holdings-based, equity market" provenance="estimated" href="/risk/attribution" />
        <Kpi label="Proposed whole-portfolio beta" value={`~${fmtNum(pro.beta)}`} sub={`${fmtPct(1 - pro.beta / cur.beta, 0)} less equity sensitivity`} provenance="estimated" tone="green" href="/risk/attribution" />
        <Kpi label="Proposed equity-sleeve beta" value={`~${pro.equitySleeveBeta === null ? "—" : fmtNum(pro.equitySleeveBeta)}`} sub="Portfolio beta ÷ equity weight" provenance="estimated" href="/risk/attribution" />
        <Kpi label="Alpha-attribution proxy" value={fmtPP(pro.alphaProxy)} sub={`Current ${fmtPP(cur.alphaProxy)}* (before Regular-plan fees)`} provenance="estimated" href="/risk/attribution" />
        <Kpi label="Current largest holding" value={fmtPct(cur.largest?.weight ?? 0)} sub={cur.largest?.fund.shortName} provenance="measured" tone="red" href="/risk/concentration" />
        <Kpi label="Proposed largest holding" value={fmtPct(pro.largest?.weight ?? 0, 0)} sub={pro.largest?.fund.shortName} provenance="calculated" tone="green" href="/risk/concentration" />
        <Kpi label="Annual saving, Regular → Direct" value={money(feeSaving)} sub={`At ${a.regularPremium}% TER differential (PDF prints ₹6–7 L — see R1)`} provenance="assumption" href="/portfolio/costs" />
        <Kpi
          label="Circular 619 compliance"
          value={comp.current.tone === "red" ? "Current: breach" : comp.current.tone === "amber" ? "Current: near limit" : "Current: compliant"}
          sub={`Current ${fmtPct(comp.current.util, 0)} · proposed ${fmtPct(comp.proposed.util, 0)} of trust money`}
          provenance="unconfirmed"
          tone={comp.current.tone}
          href="/legal/capacity"
        />
        <Kpi label="B17 status" value={b17Status} sub={`Needs ≥ ${money(breakeven)} base-tier assets elsewhere`} provenance="unconfirmed" tone={b17Status === "Confirmed" ? "green" : "red"} href="/legal/b17" />
        <Kpi label="Effective number of funds" value={`${fmtNum(cur.effectiveN, 1)} → ${fmtNum(pro.effectiveN, 1)}`} sub={`HHI ${Math.round(cur.hhi)} → ${Math.round(pro.hhi)}`} provenance="calculated" tone="green" href="/risk/concentration" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Allocation by sleeve — current vs proposed"
          description="Proposed weights follow the builder; colour follows the sleeve on every chart."
        >
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-medium text-slate-700">Current</span>
                <span className="text-slate-500">{cur.positions.length} holdings · all Regular plans</span>
              </div>
              <StackBar segments={sleeveSegments(cur)} />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-medium text-slate-700">Proposed</span>
                <span className="text-slate-500">{pro.positions.length} holdings · all Direct plans</span>
              </div>
              <StackBar segments={sleeveSegments(pro)} />
            </div>
          </div>
        </Panel>
        <Panel title="Circular 619 utilisation — proposed" description={`At B17 = ${money(state.b17)} of base-tier assets elsewhere`}>
          <CapacityGauge util={comp.proposed.util} tone={comp.proposed.tone} label={comp.proposed.label} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 px-2.5 py-2">
              <div className="text-slate-500">Must migrate to base tier</div>
              <div className="font-semibold text-slate-900">{money(comp.proposed.migration)}</div>
            </div>
            <div className="rounded-md bg-slate-50 px-2.5 py-2">
              <div className="text-slate-500">Total trust money</div>
              <div className="font-semibold text-slate-900">{money(comp.proposed.total)}</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="The problem today" description="Section 1.1 and Section 8 diagnosis">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex gap-2">
              <StatusPill tone="red" icon={false}>Concentration</StatusPill>
              Two funds are {fmtPct(cur.equity)} of the book; effective number of funds ≈ {fmtNum(cur.effectiveN, 1)}.
            </li>
            <li className="flex gap-2">
              <StatusPill tone="red" icon={false}>Cost</StatusPill>
              Every holding is a Regular plan — {money(feeSaving)} a year of avoidable cost at {a.regularPremium}%.
            </li>
            <li className="flex gap-2">
              <StatusPill tone="red" icon={false}>Liquidity</StatusPill>
              {fmtPct(cur.liquidity)} liquid ({money(cur.liquidity * cur.value)}) against a monthly payroll.
            </li>
            <li className="flex gap-2">
              <StatusPill tone="red" icon={false}>Compliance</StatusPill>
              100% in Circular 619-tier units — a breach of the 50% cap if the portfolio is the whole of trust money.
            </li>
          </ul>
        </Panel>
        <Panel
          title="Reading this dashboard"
          description="Every figure is labelled by how it was obtained."
          footer={
            <Link href="/governance/open-items" className="font-medium text-blue-700 hover:underline">
              {RECONCILIATION_FLAGS.length} reconciliation notes on printed figures →
            </Link>
          }
        >
          <ProvenanceLegend />
          <Callout tone="neutral" className="mt-3">
            Portfolio Sharpe, Sortino and maximum drawdown are <strong>not computed</strong>: they need a portfolio return
            series (open item O10). Alpha is a holdings-based attribution proxy, not a regression alpha. Forward-looking
            figures are illustrative assumptions, not forecasts.
          </Callout>
        </Panel>
      </div>
    </>
  )
}
