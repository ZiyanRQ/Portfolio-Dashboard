"use client"

import Link from "next/link"
import { CheckCircle2, Circle, CircleDot, Lock } from "lucide-react"

import { fmtPct } from "@/lib/format"
import type { TradeAction } from "@/lib/model"
import { useDashboard, type ActionStatus } from "@/lib/store"
import { Meter } from "@/components/dashboard/charts"
import { SharedStatus } from "@/components/dashboard/shared-status"
import { Callout, Kpi, PageHeader, Panel, Segmented, StatusPill, type Tone } from "@/components/dashboard/ui"

const STATUS_TONE: Record<ActionStatus, Tone> = { "Not started": "neutral", "In progress": "blue", Complete: "green", Blocked: "red" }

export default function PlanPage() {
  const { model, state, setImplementationTarget, money } = useDashboard()
  const actions = model.actions
  const status = (a: TradeAction): ActionStatus => state.actions[a.id]?.status ?? "Not started"
  const sells = actions.filter((a) => a.kind === "exit" || a.kind === "trim")
  const switches = actions.filter((a) => a.kind === "switch")
  const buys = actions.filter((a) => a.kind === "add" || a.kind === "increase")
  const b17Met = model.compliance.proposed.migration === 0
  const b17Status = state.assumptionReg.B17?.status ?? "Unconfirmed"
  const decision = (id: string) => state.decisions[id]?.status ?? "Pending"
  const realised = actions.reduce((s, a) => s + (a.kind !== "switch" ? a.realisedGain ?? 0 : 0), 0) + (switches[0]?.realisedGain ?? 0)

  const phaseDone = (list: TradeAction[]) => list.length > 0 && list.every((a) => status(a) === "Complete")
  const prechecks = [
    { label: "B17 / O2 — base-tier assets elsewhere confirmed", done: b17Status === "Confirmed" || state.implementationTarget === "fallback", note: state.implementationTarget === "fallback" ? "Not required — fallback target selected" : `Status: ${b17Status}` },
    { label: "Trustee resolution: investment policy & target allocation", done: decision("d-allocation") === "Approved" || decision("d-fallback") === "Approved", note: "Governance → Trustee decisions" },
    { label: "Trustee resolution: Direct-only plan-type policy", done: decision("d-direct") === "Approved", note: "Governance → Trustee decisions" },
    { label: "Trustee Sharia decision (if the Tata Ethical sleeve is held)", done: decision("d-sharia") !== "Pending", note: "Optional — B9 / O9" },
    { label: "Chartered-accountant confirmation of tax treatment", done: false, note: "s.11(1A) sequencing; §19" },
    ...(state.implementationTarget === "fallback" ? [{ label: "Trust demat / CSGL account mechanics for direct G-Secs", done: false, note: "§18" }] : []),
  ]

  const phases = [
    { n: 0, title: "Legal & accounting confirmation", sub: "Must precede the first trade", items: null as TradeAction[] | null, done: prechecks.every((p) => p.done) },
    { n: 1, title: "Sell legs", sub: "Exit ABSL Liquid; trim ABSL Flexi in one step; stage the SBI trim across tranches", items: sells, done: phaseDone(sells) },
    { n: 2, title: "Switch retained holdings to Direct", sub: "A switch is a redemption for tax — fold into the same reinvestment tranche", items: switches, done: phaseDone(switches) },
    { n: 3, title: "Buy legs", sub: "Direct-Growth plans; reinvest within the s.11(1A) window", items: buys, done: phaseDone(buys) },
    { n: 4, title: "Ongoing governance", sub: "Start the §20 monitoring calendar", items: null, done: false },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Implementation · Transition plan"
        title="From current to proposed"
        description="Kept separate: the investment recommendation (what to hold), the implementation mechanics (how to get there), and the legal/accounting confirmation (which must precede the first trade)."
        actions={
          <>
            <SharedStatus />
            <Segmented<"proposed" | "fallback">
              ariaLabel="Implementation target"
              value={state.implementationTarget}
              onChange={setImplementationTarget}
              options={[
                { value: "proposed", label: "Target: Core Growth (B17 confirmed)" },
                { value: "fallback", label: "Target: Compliance fallback" },
              ]}
            />
          </>
        }
      />

      {!b17Met && state.implementationTarget === "proposed" && (
        <Callout tone="amber" title="The B17 input does not support a 100%-fund target">
          At B17 = {money(state.b17)}, the proposal would need {money(model.compliance.proposed.migration)} in the base tier.
          Either confirm B17 or switch the target to the compliance fallback.
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Actions" value={actions.length} sub={`${model.transition.completed} complete`} provenance="calculated" />
        <Kpi label="Total sells" value={money(sells.reduce((s, a) => s + a.tradeAmount, 0))} provenance="calculated" />
        <Kpi label="Total buys" value={money(buys.reduce((s, a) => s + a.tradeAmount, 0))} provenance="calculated" />
        <Kpi label="Regular → Direct switch" value={money(switches[0]?.tradeAmount ?? 0)} provenance="calculated" />
        <Kpi label="Gains crystallised (approx.)" value={money(realised)} sub="Pro-rata of reported gains; FIFO lots apply" provenance="estimated" />
        <Kpi label="Progress (by value)" value={fmtPct(model.transition.valueProgress, 0)} sub={<Meter value={model.transition.valueProgress} className="mt-1" />} provenance="calculated" href="/implementation/progress" />
      </div>

      <Panel title="Sequence">
        <ol className="space-y-5">
          {phases.map((p) => {
            const started = p.items?.some((a) => status(a) !== "Not started")
            const Icon = p.done ? CheckCircle2 : started ? CircleDot : p.n === 0 ? Lock : Circle
            return (
              <li key={p.n} className="grid gap-3 sm:grid-cols-[2rem_1fr]">
                <Icon className={p.done ? "size-6 text-emerald-600" : started ? "size-6 text-blue-600" : "size-6 text-slate-300"} />
                <div className="min-w-0 space-y-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {p.n}. {p.title}
                    </div>
                    <div className="text-xs text-slate-500">{p.sub}</div>
                  </div>
                  {p.n === 0 && (
                    <ul className="space-y-1">
                      {prechecks.map((c) => (
                        <li key={c.label} className="flex flex-wrap items-center gap-2 text-sm">
                          <StatusPill tone={c.done ? "green" : "amber"}>{c.done ? "Done" : "Open"}</StatusPill>
                          <span className="text-slate-700">{c.label}</span>
                          <span className="text-xs text-slate-400">{c.note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.items && (
                    <ul className="grid gap-1.5 md:grid-cols-2">
                      {p.items.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-slate-800">
                              {a.title}
                              {a.optional && <span className="ml-1 text-[11px] text-slate-400">(optional)</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {a.side} {money(a.tradeAmount)}
                            </div>
                          </div>
                          <StatusPill tone={STATUS_TONE[status(a)]}>{status(a)}</StatusPill>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.n === 4 && (
                    <Link href="/governance/calendar" className="text-xs font-medium text-blue-700 hover:underline">
                      Open the monitoring calendar →
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </Panel>

      <Callout tone="neutral">
        Approvals: a trustee resolution recording the investment policy, the plan-type policy, the Sharia decision and (if
        adopted) the base-tier fallback. Direct G-Secs are bought through a bank / primary dealer or broker with the trust&apos;s
        demat/CSGL arrangement. <Link href="/implementation/trades" className="font-medium underline">Update trade statuses →</Link>
      </Callout>
    </>
  )
}
