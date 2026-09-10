"use client"

import { todayISO } from "@/lib/format"
import { ACTION_STATUSES, useDashboard, type ActionStatus } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Meter } from "@/components/dashboard/charts"
import { SharedStatus } from "@/components/dashboard/shared-status"
import { Callout, PageHeader, Panel, StatusPill, TableWrap, Td, Th, type Tone } from "@/components/dashboard/ui"

const SIDE_TONE: Record<string, Tone> = { Sell: "red", Buy: "green", Switch: "blue" }

export default function TradesPage() {
  const { model, state, setRecord, resetRecords, money } = useDashboard()
  const actions = model.actions

  const setStatus = (id: string, status: ActionStatus) => {
    const prev = state.actions[id]
    setRecord("actions", id, {
      status,
      date: status === "Complete" ? prev?.date ?? todayISO() : prev?.date ?? null,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Implementation · Trades"
        title="Trade list"
        description={`Generated from the difference between the current holdings and the ${state.implementationTarget === "fallback" ? "compliance fallback" : "proposed portfolio"} — it follows every builder or substitution change. Marking an action complete updates the transition progress and the actual allocation.`}
        actions={
          <>
            <SharedStatus />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.confirm("Clear all trade statuses and dates for every user?") && resetRecords("actions")}
            >
              Reset statuses
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progress by value traded</span>
            <span className="font-semibold text-slate-900">{Math.round(model.transition.valueProgress * 100)}%</span>
          </div>
          <Meter value={model.transition.valueProgress} className="mt-2" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Actions complete</span>
            <span className="font-semibold text-slate-900">
              {model.transition.completed} / {actions.length}
            </span>
          </div>
          <Meter value={model.transition.countProgress} className="mt-2" />
        </div>
      </div>

      {model.transition.fundingGap > 0 && (
        <Callout tone="red" title="Buys completed ahead of sale proceeds">
          Completed purchases exceed completed sales by {money(model.transition.fundingGap)}. Complete the corresponding sell legs
          first — the trust should not be a forced seller.
        </Callout>
      )}

      <Panel>
        <TableWrap>
          <thead>
            <tr>
              <Th>Action</Th>
              <Th>Side</Th>
              <Th align="right">Current</Th>
              <Th align="right">Target</Th>
              <Th align="right">Trade</Th>
              <Th>Status</Th>
              <Th>Dependency</Th>
              <Th>Approval</Th>
              <Th>Tax note</Th>
              <Th>Completion date</Th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const rec = state.actions[a.id]
              const status = rec?.status ?? "Not started"
              return (
                <tr key={a.id} className={status === "Complete" ? "bg-emerald-50/40" : status === "Blocked" ? "bg-red-50/40" : undefined}>
                  <Td className="max-w-64 whitespace-normal">
                    <div className="font-medium text-slate-900">{a.title}</div>
                    {a.optional && <div className="text-[11px] text-slate-500">Optional — trustee preference</div>}
                  </Td>
                  <Td>
                    <StatusPill tone={SIDE_TONE[a.side]} icon={false}>
                      {a.side}
                    </StatusPill>
                  </Td>
                  <Td align="right">{money(a.currentAmount)}</Td>
                  <Td align="right">{money(a.targetAmount)}</Td>
                  <Td align="right" className="font-semibold text-slate-900">
                    {money(a.tradeAmount)}
                  </Td>
                  <Td>
                    <select
                      aria-label={`${a.title} status`}
                      value={status}
                      onChange={(e) => setStatus(a.id, e.target.value as ActionStatus)}
                      className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs"
                    >
                      {ACTION_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Td>
                  <Td className="max-w-56 text-xs whitespace-normal text-slate-600">{a.dependency}</Td>
                  <Td className="max-w-44 text-xs whitespace-normal text-slate-600">{a.approval}</Td>
                  <Td className="max-w-64 text-xs whitespace-normal text-slate-600">
                    {a.realisedGain !== null && a.realisedGain > 0 && (
                      <div className="font-medium text-slate-800">Realises ≈ {money(a.realisedGain)} gain</div>
                    )}
                    {a.taxNote}
                  </Td>
                  <Td>
                    <input
                      type="date"
                      aria-label={`${a.title} completion date`}
                      value={rec?.date ?? ""}
                      onChange={(e) => setRecord("actions", a.id, { status, date: e.target.value || null })}
                      className="h-7 rounded-md border border-slate-200 px-1.5 text-xs"
                    />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
        <p className="mt-3 text-xs text-slate-500">
          Amounts assume the portfolio stays at the statement value and ignore exit loads and taxes. Realised gains are a
          pro-rata share of the reported unrealised gain; actual gains follow FIFO lots — confirm with a chartered accountant.
          Legal research, not tax advice.
        </p>
      </Panel>
    </>
  )
}
