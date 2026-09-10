"use client"

import { RECONCILIATION_FLAGS } from "@/lib/data/governance"
import { OPEN_ITEMS, type OpenItemStatus } from "@/lib/data/legal"
import { useDashboard } from "@/lib/store"
import { Callout, PageHeader, Panel, StatusPill, TableWrap, Td, Th, type Tone } from "@/components/dashboard/ui"
import { SharedStatus } from "@/components/dashboard/shared-status"

const STATUSES: OpenItemStatus[] = ["Open", "Control", "Trustee", "Partly closed", "Closed"]
const TONE: Record<OpenItemStatus, Tone> = { Open: "red", Control: "blue", Trustee: "amber", "Partly closed": "amber", Closed: "green" }

const NOT_COMPUTED = [
  ["Portfolio Sharpe / Sortino", "Needs a portfolio return / covariance series (O10)"],
  ["Maximum drawdown", "Undisclosed for most funds; no portfolio history (O10)"],
  ["Regression alpha / beta", "Holdings-based proxies computed; regression needs monthly NAV + benchmark series (O10)"],
  ["Sector look-through", "Fund-level sector weights not reproduced in the proposal"],
  ["Per-fund TER", "Not disclosed per fund; a blended Direct-plan cost assumption is used"],
  ["Phase 3 component scores", "Only Legal Compliance and HDFC Mid Cap Risk are reproduced"],
  ["Payroll / fee-cycle data", "Not in the record (B14) — liquidity adequacy needs trustee input"],
]

export default function OpenItemsPage() {
  const { state, setRecord } = useDashboard()

  return (
    <>
      <PageHeader
        eyebrow="Governance · Open items"
        title="Open items requiring confirmation"
        description="Section 22, plus the reconciliation notes and data gaps this dashboard identifies. Statuses, owners and notes are shared with every signed-in user."
        actions={<SharedStatus />}
      />

      <Panel title="Open items (O1–O12)">
        <TableWrap>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Issue</Th>
              <Th>Why it matters / if the assumption changes</Th>
              <Th>Action</Th>
              <Th>Status</Th>
              <Th>Owner</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody>
            {OPEN_ITEMS.map((o) => {
              const rec = state.openItems[o.id] ?? {}
              const status = rec.status ?? o.status
              return (
                <tr key={o.id} className={o.id === "O2" ? "bg-red-50/60" : undefined}>
                  <Td className="font-mono text-xs font-semibold">{o.id}</Td>
                  <Td className="max-w-56 whitespace-normal font-medium text-slate-800">{o.issue}</Td>
                  <Td className="max-w-72 text-xs whitespace-normal text-slate-600">{o.why}</Td>
                  <Td className="max-w-56 text-xs whitespace-normal text-slate-600">{o.action}</Td>
                  <Td>
                    <select
                      aria-label={`${o.id} status`}
                      value={status}
                      onChange={(e) => setRecord("openItems", o.id, { status: e.target.value })}
                      className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <div className="mt-1">
                      <StatusPill tone={TONE[status]} icon={false} className="text-[10px]">
                        {status}
                      </StatusPill>
                    </div>
                  </Td>
                  <Td>
                    <input
                      aria-label={`${o.id} owner`}
                      value={rec.owner ?? ""}
                      placeholder="To be assigned"
                      onChange={(e) => setRecord("openItems", o.id, { owner: e.target.value })}
                      className="h-7 w-32 rounded-md border border-slate-200 px-1.5 text-xs placeholder:text-slate-400"
                    />
                  </Td>
                  <Td>
                    <input
                      aria-label={`${o.id} note`}
                      value={rec.note ?? ""}
                      onChange={(e) => setRecord("openItems", o.id, { note: e.target.value })}
                      className="h-7 w-44 rounded-md border border-slate-200 px-1.5 text-xs"
                    />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      </Panel>

      <Panel title="Reconciliation notes" description="Where a printed figure is not reproduced by the arithmetic it implies. The dashboard shows both and uses the arithmetic.">
        <div className="grid gap-3 md:grid-cols-2">
          {RECONCILIATION_FLAGS.map((r) => (
            <div key={r.id} className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-amber-900">{r.id}</span>
                <span className="text-sm font-semibold text-slate-900">{r.title}</span>
              </div>
              <dl className="space-y-1 text-xs">
                <div>
                  <dt className="inline font-medium text-slate-700">Printed: </dt>
                  <dd className="inline text-slate-600">{r.printed}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-slate-700">Computed: </dt>
                  <dd className="inline text-slate-600">{r.computed}</dd>
                </div>
                <dd className="text-slate-500">{r.note}</dd>
              </dl>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Not computed — and why" description="Shown as “not available” across the dashboard rather than estimated">
        <ul className="divide-y divide-slate-100">
          {NOT_COMPUTED.map(([k, v]) => (
            <li key={k} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
              <span className="text-sm font-medium text-slate-800">{k}</span>
              <span className="text-sm text-slate-600">{v}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Callout tone="neutral">
        Every material assumption is numbered in the assumption register (B1–B17) and every unresolved point appears above. The
        legal propositions have not been reviewed by a lawyer or chartered accountant.
      </Callout>
    </>
  )
}
