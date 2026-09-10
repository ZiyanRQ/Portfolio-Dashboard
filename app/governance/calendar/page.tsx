"use client"

import { MONITORING_TASKS, TASK_STATUSES, type Frequency, type MonitoringTask, type TaskStatus } from "@/lib/data/governance"
import { LIMITS, RECOMMENDED_SLOTS } from "@/lib/data/portfolio"
import { fmtDate, fmtPct, todayISO } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { Kpi, PageHeader, Panel, StatusPill, type Tone } from "@/components/dashboard/ui"
import { SharedStatus } from "@/components/dashboard/shared-status"

const TONE: Record<TaskStatus, Tone> = {
  Complete: "green",
  Due: "blue",
  Overdue: "red",
  "Requires Trustee Decision": "amber",
  "Requires External Confirmation": "amber",
}
const MONTHS: Record<Frequency, number> = { Monthly: 1, Quarterly: 3, Annual: 12 }

function addMonths(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const { state, setRecord, model } = useDashboard()
  const today = todayISO()

  const effective = (t: MonitoringTask): TaskStatus => {
    const rec = state.tasks[t.id] ?? {}
    const status = rec.status ?? t.defaultStatus
    const due = rec.nextDue ?? t.defaultNextDue
    if ((status === "Due" || status === "Complete") && due < today) return "Overdue"
    return status
  }

  // Live readings from the model, shown against the relevant checks.
  const pro = model.proposed
  const drift = Math.max(
    ...RECOMMENDED_SLOTS.map((r) => {
      const now = pro.positions.filter((p) => p.fund.id === r.fundId).reduce((s, p) => s + p.weight, 0)
      return Math.abs(now * 100 - r.weight)
    })
  )
  const ppfas = pro.positions.find((p) => p.fund.id === "ppfas-flexi")
  const live: Record<string, { text: string; tone: Tone }> = {
    "m-c619": { text: `Proposed ${fmtPct(model.compliance.proposed.util, 1)} of trust money`, tone: model.compliance.proposed.tone },
    "m-ppfas": ppfas
      ? { text: `~${LIMITS.ppfasIndianListedApprox}% Indian-listed (review < ${LIMITS.ppfasIndianListedReview}%)`, tone: "amber" }
      : { text: "Not held in the proposal", tone: "neutral" },
    "m-drift": { text: `Max fund drift vs printed target ${drift.toFixed(1)} pp`, tone: drift > LIMITS.fundBand ? "amber" : "green" },
    "m-liquidity": { text: `Liquidity ${fmtPct(pro.liquidity, 1)}`, tone: pro.liquidity >= 0.05 ? "green" : "amber" },
    "q-credit": { text: `Below-AAA ${fmtPct(pro.credit.belowAAA, 2)} of portfolio`, tone: pro.credit.belowAAA > 0 ? "amber" : "green" },
    "q-fundmon": { text: `Top-5 ${fmtPct(pro.top5, 0)} · largest ${fmtPct(pro.largest?.weight ?? 0, 0)}`, tone: pro.top5 > LIMITS.top5Trigger / 100 ? "red" : pro.top5 > 0.67 ? "amber" : "green" },
    "q-ter": { text: `Regular plans today: ${fmtPct(model.current.regularWeight, 0)}`, tone: "red" },
  }

  const counts = TASK_STATUSES.map((s) => ({ s, n: MONITORING_TASKS.filter((t) => effective(t) === s).length }))

  const markComplete = (t: MonitoringTask) => {
    setRecord("tasks", t.id, { status: "Complete", lastCompleted: today, nextDue: addMonths(today, MONTHS[t.frequency]) })
  }

  return (
    <>
      <PageHeader
        eyebrow="Governance · Monitoring calendar"
        title="Monitoring & rebalancing calendar"
        description="The §20 checks and §21 triggers. Owners, statuses, dates and notes are shared with every signed-in user; a task past its next-due date shows as overdue automatically."
        actions={<SharedStatus />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {counts.map(({ s, n }) => (
          <Kpi key={s} label={s} value={n} tone={n > 0 ? (TONE[s] === "neutral" ? undefined : TONE[s]) : undefined} />
        ))}
      </div>

      {(["Monthly", "Quarterly", "Annual"] as Frequency[]).map((freq) => (
        <Panel key={freq} title={freq} description={freq === "Annual" ? "Next due at financial-year end (31 March)" : freq === "Quarterly" ? "Quarter-end reviews" : "Month-end checks"}>
          <div className="divide-y divide-slate-100">
            {MONITORING_TASKS.filter((t) => t.frequency === freq).map((t) => {
              const rec = state.tasks[t.id] ?? {}
              const status = effective(t)
              const reading = live[t.id]
              return (
                <div key={t.id} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{t.title}</span>
                      <StatusPill tone={TONE[status]}>{status}</StatusPill>
                    </div>
                    <div className="text-xs text-slate-600">{t.check}</div>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Trigger:</span> {t.trigger}
                    </div>
                    <div className="text-[11px] text-slate-400">Evidence / source: {t.evidence}</div>
                    {reading && (
                      <div className="pt-0.5">
                        <StatusPill tone={reading.tone} icon={false} className="text-[11px]">
                          Live: {reading.text}
                        </StatusPill>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="space-y-0.5">
                      <span className="text-slate-500">Owner</span>
                      <input
                        value={rec.owner ?? ""}
                        placeholder="To be assigned"
                        onChange={(e) => setRecord("tasks", t.id, { owner: e.target.value })}
                        className="h-7 w-full rounded-md border border-slate-200 px-1.5 placeholder:text-slate-400"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500">Status</span>
                      <select
                        value={rec.status ?? t.defaultStatus}
                        onChange={(e) => setRecord("tasks", t.id, { status: e.target.value })}
                        className="h-7 w-full rounded-md border border-slate-200 bg-white px-1"
                      >
                        {TASK_STATUSES.filter((s) => s !== "Overdue").map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500">Last completed</span>
                      <input
                        type="date"
                        value={rec.lastCompleted ?? ""}
                        onChange={(e) => setRecord("tasks", t.id, { lastCompleted: e.target.value })}
                        className="h-7 w-full rounded-md border border-slate-200 px-1.5"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500">Next due</span>
                      <input
                        type="date"
                        value={rec.nextDue ?? t.defaultNextDue}
                        onChange={(e) => setRecord("tasks", t.id, { nextDue: e.target.value })}
                        className="h-7 w-full rounded-md border border-slate-200 px-1.5"
                      />
                    </label>
                    <label className="col-span-2 space-y-0.5">
                      <span className="text-slate-500">Notes</span>
                      <input
                        value={rec.notes ?? ""}
                        placeholder={rec.lastCompleted ? `Last done ${fmtDate(rec.lastCompleted)}` : "Not yet performed — portfolio not implemented"}
                        onChange={(e) => setRecord("tasks", t.id, { notes: e.target.value })}
                        className="h-7 w-full rounded-md border border-slate-200 px-1.5 placeholder:text-slate-400"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => markComplete(t)}
                      className="col-span-2 h-7 rounded-md border border-slate-200 font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      Mark complete &amp; schedule next
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      ))}

      <Panel title="Rebalancing policy (§21)">
        <dl className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-2">
          {[
            ["Tolerance bands", "± 3 pp per fund; ± 5 pp per sleeve (equity / income / liquidity)"],
            ["Maximum position size", "20% per fund (hard); no single AMC above ~32% without a recorded rationale"],
            ["Circular 619 warning level", "45% of trust money — internal working ceiling; rebalance toward target"],
            ["Circular 619 hard limit", "50% of trust money — adopted legal ceiling; remediate without delay"],
            ["Mandatory rebalancing", "Any fund > 20%; sleeve outside its band; C619 > 45%; a Gate-1 monitoring failure (L1)"],
            ["Trustee approval", "Any change to target weights, plan type, the Sharia decision or the base-tier split"],
            ["Full review trigger", "Confirmation or refutation of B17; discovery of Form 10 money (B8); a manager departure at a core fund"],
          ].map(([k, v]) => (
            <div key={k} className="border-l-2 border-slate-200 pl-3">
              <dt className="text-xs font-semibold text-slate-900">{k}</dt>
              <dd className="text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </>
  )
}
