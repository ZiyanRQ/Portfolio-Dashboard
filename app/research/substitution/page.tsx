"use client"

import { RotateCcw } from "lucide-react"

import { FUNDS, getFund, substitutionGroup } from "@/lib/data/funds"
import { RECOMMENDED_SLOTS } from "@/lib/data/portfolio"
import { SLEEVE_COLORS, SLEEVE_LABELS } from "@/lib/colors"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { equityShock, type Metrics } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { clauseLabel, FundButton } from "@/components/dashboard/common"
import { Button } from "@/components/ui/button"
import { Callout, Delta, PageHeader, Panel, Swatch, TableWrap, Td, Th } from "@/components/dashboard/ui"

export default function SubstitutionPage() {
  const { state, model, money, setSlotFund, resetSlots } = useDashboard()
  const m = model.proposed
  const rec = model.recommended

  const compare: { label: string; get: (x: Metrics) => number; fmt: (v: number) => string; diff: (d: number) => string; goodWhen: "up" | "down" | "none" }[] = [
    { label: "Equity allocation", get: (x) => x.equity, fmt: (v) => fmtPct(v), diff: (d) => fmtPP(d * 100, 1), goodWhen: "none" },
    { label: "Portfolio beta", get: (x) => x.beta, fmt: (v) => fmtNum(v, 3), diff: (d) => fmtNum(d, 3), goodWhen: "down" },
    { label: "Alpha proxy", get: (x) => x.alphaProxy, fmt: (v) => fmtPP(v, 3), diff: (d) => fmtPP(d, 3), goodWhen: "up" },
    { label: "Expected return", get: (x) => x.expectedReturn, fmt: (v) => fmtRate(v, 2), diff: (d) => fmtPP(d, 2), goodWhen: "up" },
    { label: "Top-5 concentration", get: (x) => x.top5, fmt: (v) => fmtPct(v), diff: (d) => fmtPP(d * 100, 1), goodWhen: "down" },
    { label: "HHI", get: (x) => x.hhi, fmt: (v) => String(Math.round(v)), diff: (d) => `${d > 0 ? "+" : "−"}${Math.abs(Math.round(d))}`, goodWhen: "down" },
    { label: "Estimated annual fees", get: (x) => x.annualFees, fmt: (v) => money(v), diff: (d) => money(d, { sign: true }), goodWhen: "down" },
    { label: "Circular 619 tier", get: (x) => x.c619, fmt: (v) => fmtPct(v, 0), diff: (d) => fmtPP(d * 100, 1), goodWhen: "down" },
    { label: "Stress: equities −20% (beta)", get: (x) => equityShock(x, -20, "beta"), fmt: (v) => fmtRate(v, 1, true), diff: (d) => fmtPP(d, 2), goodWhen: "up" },
  ]

  const substituted = state.slots.filter((s) => {
    const orig = RECOMMENDED_SLOTS.find((r) => r.slotId === s.slotId)
    return orig && orig.fundId !== s.fundId
  }).length

  return (
    <>
      <PageHeader
        eyebrow="Fund Research · Substitution"
        title="Fund substitution tool"
        description="Replace any proposed holding with another shortlisted fund from the same role. The weight is kept; allocation, beta, alpha, return, concentration, fees, regulatory tier and stress results recalculate everywhere."
        actions={
          <Button variant="outline" size="sm" onClick={resetSlots} disabled={!model.modified}>
            <RotateCcw /> Reset to original recommendation
          </Button>
        }
      />

      {m.placeholders.length > 0 && (
        <Callout tone="amber" title="Incomplete data for a substitute">
          The proposal does not disclose alpha/beta for: {m.placeholders.join(", ")}. The model uses the PDF&apos;s own
          convention for an unmeasured fund (equity beta 1.00, alpha 0) — treat beta and alpha as indicative until the
          fund&apos;s factsheet figures are added.
        </Callout>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Holdings" description={`${substituted} substitution${substituted === 1 ? "" : "s"} from the original recommendation`}>
          <TableWrap>
            <thead>
              <tr>
                <Th>Role</Th>
                <Th align="right">Weight</Th>
                <Th>Holding / substitute</Th>
                <Th align="right">P3</Th>
                <Th align="right">α / β</Th>
                <Th>Tier</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {state.slots.map((s) => {
                const f = getFund(s.fundId)
                const orig = RECOMMENDED_SLOTS.find((r) => r.slotId === s.slotId)
                const origFund = orig ? getFund(orig.fundId) : f
                const group = substitutionGroup(origFund)
                const options = FUNDS.filter(
                  (x) =>
                    substitutionGroup(x) === group &&
                    x.id !== "absl-liquid" &&
                    x.id !== "cash-pending" &&
                    (x.id === s.fundId || !state.slots.some((o) => o.fundId === x.id))
                ).sort((a, b) => (b.phase3Score ?? 0) - (a.phase3Score ?? 0))
                const changed = orig !== undefined && orig.fundId !== s.fundId
                return (
                  <tr key={s.slotId} className={changed ? "bg-amber-50/60" : undefined}>
                    <Td>
                      <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <Swatch color={SLEEVE_COLORS[origFund.sleeve]} />
                        {SLEEVE_LABELS[origFund.sleeve]}
                      </span>
                    </Td>
                    <Td align="right">{fmtPct(s.weight / 100, 1)}</Td>
                    <Td>
                      <select
                        aria-label={`Substitute for ${origFund.shortName}`}
                        value={s.fundId}
                        onChange={(e) => setSlotFund(s.slotId, e.target.value)}
                        className="h-8 w-64 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.shortName}
                            {o.phase3Score !== null ? ` · P3 ${o.phase3Score.toFixed(1)}` : ""}
                            {o.id === origFund.id ? " (recommended)" : o.researchStatus === "rejected" ? " (not recommended)" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="mt-0.5">
                        <FundButton fund={f} label="View profile" className="text-[11px] font-normal text-blue-700" />
                        {changed && <span className="ml-2 text-[11px] text-amber-800">replaces {origFund.shortName}</span>}
                      </div>
                    </Td>
                    <Td align="right">{f.phase3Score?.toFixed(1) ?? "—"}</Td>
                    <Td align="right" className="text-xs">
                      {f.alpha === null ? "n/a" : fmtPP(f.alpha)} / {f.beta === null ? "n/a" : fmtNum(f.beta)}
                    </Td>
                    <Td className="text-xs">{clauseLabel(f)}</Td>
                    <Td>
                      {changed && orig && (
                        <button
                          type="button"
                          onClick={() => setSlotFund(s.slotId, orig.fundId)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
          <p className="mt-3 text-xs text-slate-500">
            Nippon India Large Cap (8.4) is the proposal&apos;s designated first substitute if a core name is dropped. Rejected
            funds remain selectable for comparison but are flagged.
          </p>
        </Panel>

        <Panel title="Before / after" description="Original recommendation → with substitutions" className="xl:sticky xl:top-20">
          <div className="divide-y divide-slate-100">
            {compare.map((c) => {
              const a = c.get(rec)
              const b = c.get(m)
              return (
                <div key={c.label} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-xs text-slate-600">{c.label}</span>
                  <span className="text-right">
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{c.fmt(b)}</span>
                    <span className="ml-2 inline-block w-16 text-right text-[11px]">
                      <Delta value={b - a} display={Math.abs(b - a) < 1e-9 ? "—" : c.diff(b - a)} goodWhen={c.goodWhen} />
                    </span>
                    <div className="text-[10px] text-slate-400 tabular-nums">was {c.fmt(a)}</div>
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </>
  )
}
