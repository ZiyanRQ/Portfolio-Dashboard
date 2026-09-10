"use client"

import { DECISION_STATUSES, TRUSTEE_DECISIONS, type DecisionStatus } from "@/lib/data/governance"
import { useDashboard } from "@/lib/store"
import { Kpi, PageHeader, Panel, StatusPill, TableWrap, Td, Th, type Tone } from "@/components/dashboard/ui"
import { SharedStatus } from "@/components/dashboard/shared-status"

const TONE: Record<DecisionStatus, Tone> = { Pending: "amber", Approved: "green", Deferred: "neutral", Rejected: "red" }
const CATEGORY_TONE: Record<string, Tone> = {
  Recommended: "green",
  "Recommended — subject to confirmation": "amber",
  "Optional — trustee decision": "blue",
  Conditional: "amber",
  Governance: "neutral",
  "Dashboard-identified": "neutral",
}

const FINAL = [
  ["Recommended", "Move all capital to Direct-Growth plans; diversify into the Section 12 allocation; replace ABSL Liquid with ICICI Liquid; institute the §20 monitoring framework."],
  ["Recommended — subject to confirmation", "Holding the portfolio 100% in mutual funds — conditional on qualifying base-tier assets ≥ ₹6.46 cr held elsewhere (B17 / O2). If unconfirmed, adopt the §13.4 base-split fallback (~₹2.91 cr into direct G-Secs and deposits)."],
  ["Optional — trustee decision", "The 5% Tata Ethical Sharia sleeve; and the Sharia standard (4% vs TASIS 2.5%)."],
  ["Not recommended (for now)", "Taurus, Quantum and The Wealth Company Ethical for a Sharia mandate until S1–S5 are closed; ICICI Gilt as a stable-sleeve holding (rate risk)."],
  ["Excluded by law / prudence", "Direct non-PSU shares (Gate 2); AA+ corporate / AT1 / infra debt; Basel III AT1 bonds; Regular plans; balanced-advantage / conservative-hybrid / multi-asset funds."],
]

export default function DecisionsPage() {
  const { state, setRecord } = useDashboard()
  const statusOf = (id: string) => state.decisions[id]?.status ?? "Pending"
  const counts = DECISION_STATUSES.map((s) => ({ s, n: TRUSTEE_DECISIONS.filter((d) => statusOf(d.id) === s).length }))

  return (
    <>
      <PageHeader
        eyebrow="Governance · Trustee decisions"
        title="Decisions for the board"
        description="What the trustees are asked to resolve. Decisions are shared with every signed-in user and update the implementation pre-checks."
        actions={<SharedStatus />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {counts.map(({ s, n }) => (
          <Kpi key={s} label={s} value={n} tone={n > 0 && s !== "Deferred" ? TONE[s] : undefined} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {TRUSTEE_DECISIONS.map((d) => {
          const rec = state.decisions[d.id]
          const status = statusOf(d.id)
          return (
            <Panel
              key={d.id}
              title={d.title}
              description={<StatusPill tone={CATEGORY_TONE[d.category]} icon={false} className="mt-1">{d.category}</StatusPill>}
              actions={<StatusPill tone={TONE[status]}>{status}</StatusPill>}
              bodyClassName="space-y-3"
            >
              <p className="text-sm text-slate-700">{d.detail}</p>
              {d.dependency && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Depends on:</span> {d.dependency}
                </p>
              )}
              <p className="text-[11px] text-slate-400">Source: {d.source}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {DECISION_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRecord("decisions", d.id, { status: s, note: rec?.note ?? "" })}
                    aria-pressed={status === s}
                    className={
                      status === s
                        ? "rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400"
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
              <textarea
                aria-label={`${d.title} — minute / note`}
                value={rec?.note ?? ""}
                onChange={(e) => setRecord("decisions", d.id, { status, note: e.target.value })}
                placeholder="Minute reference or note"
                rows={2}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs placeholder:text-slate-400"
              />
            </Panel>
          )
        })}
      </div>

      <Panel title="Final trustee recommendation (Section 23)">
        <TableWrap>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Item</Th>
            </tr>
          </thead>
          <tbody>
            {FINAL.map(([k, v]) => (
              <tr key={k}>
                <Td className="w-64 align-top font-semibold whitespace-normal text-slate-900">{k}</Td>
                <Td className="whitespace-normal text-slate-700">{v}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="mt-3 text-sm text-slate-700">
          <strong>In one paragraph:</strong> bring the portfolio inside the two-gate framework and out of its current two-fund,
          all-Regular, all-equity position. Adopt the Core Growth 70/30 in Direct plans, keep both incumbents in trimmed form, add
          a researched income and liquidity sleeve, and decide the Sharia preference explicitly at its stated price. The one
          number to confirm before implementation is B17 — it decides whether the portfolio may stay wholly in funds or must place
          ~₹2.91 cr in direct government securities and deposits. Either way the destination is compliant, more diversified,
          cheaper to run and more liquid.
        </p>
      </Panel>
    </>
  )
}
