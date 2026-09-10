"use client"

import { useState } from "react"
import { Plus, RotateCcw, Scale, Trash2 } from "lucide-react"

import { BUILDER_UNIVERSE, getFund } from "@/lib/data/funds"
import { SLEEVE_COLORS, SLEEVE_LABELS, SLEEVE_ORDER } from "@/lib/colors"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { equityShock, largestHoldingShock, rateShock, type Metrics } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { CapacityGauge, StackBar } from "@/components/dashboard/charts"
import { classSegments, FundButton, limitChecks, LimitList } from "@/components/dashboard/common"
import { Button } from "@/components/ui/button"
import {
  Callout,
  Delta,
  PageHeader,
  Panel,
  Provenance,
  RangeField,
  SelectField,
  Swatch,
  type ProvenanceKind,
} from "@/components/dashboard/ui"

function MetricLine({
  label,
  value,
  delta,
  provenance,
}: {
  label: string
  value: string
  delta?: { value: number; display: string; goodWhen: "up" | "down" | "none" }
  provenance?: ProvenanceKind
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
        <span className="truncate">{label}</span>
        {provenance && <Provenance kind={provenance} />}
      </span>
      <span className="flex shrink-0 items-baseline gap-2">
        <span className="text-sm font-semibold text-slate-900 tabular-nums">{value}</span>
        {delta && (
          <Delta className="w-16 justify-end text-[11px]" value={delta.value} display={delta.display} goodWhen={delta.goodWhen} />
        )}
      </span>
    </div>
  )
}

function ppDelta(a: number, b: number, goodWhen: "up" | "down" | "none") {
  const d = (a - b) * 100
  return { value: d, display: Math.abs(d) < 0.005 ? "—" : fmtPP(d, 1), goodWhen }
}

export default function BuilderPage() {
  const { state, model, money, set, setSlotWeight, addSlot, removeSlot, setSlots, resetSlots } = useDashboard()
  const m: Metrics = model.proposed
  const rec = model.recommended
  const comp = model.compliance.proposed
  const total = model.slotsTotal
  const balanced = Math.abs(total - 100) < 0.01
  const [addId, setAddId] = useState("")
  const available = BUILDER_UNIVERSE.filter((f) => !state.slots.some((s) => s.fundId === f.id))

  const normalise = () => {
    if (total <= 0) return
    const next = state.slots.map((s) => ({ ...s, weight: Math.round((s.weight / total) * 10000) / 100 }))
    const diff = Math.round((100 - next.reduce((acc, s) => acc + s.weight, 0)) * 100) / 100
    if (diff !== 0 && next.length) {
      const i = next.reduce((bi, s, idx, arr) => (s.weight > arr[bi].weight ? idx : bi), 0)
      next[i] = { ...next[i], weight: Math.round((next[i].weight + diff) * 100) / 100 }
    }
    setSlots(next)
  }

  const orderedSlots = [...state.slots].sort(
    (x, y) => SLEEVE_ORDER.indexOf(getFund(x.fundId).sleeve) - SLEEVE_ORDER.indexOf(getFund(y.fundId).sleeve)
  )

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Builder"
        title="Interactive portfolio builder"
        description="Change weights, add or remove funds and base-tier instruments. Every page — risk, legal capacity, implementation, stress tests — recalculates from this portfolio."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={normalise} disabled={balanced}>
              <Scale /> Normalise to 100%
            </Button>
            <Button variant="outline" size="sm" onClick={resetSlots} disabled={!model.modified}>
              <RotateCcw /> Reset to recommended portfolio
            </Button>
          </>
        }
      />

      {!balanced && (
        <Callout tone="red" title={`Weights total ${total.toFixed(2)}% — not 100%`}>
          {total > 100 ? `Over-allocated by ${(total - 100).toFixed(2)} pp.` : `Under-allocated by ${(100 - total).toFixed(2)} pp.`} Metrics
          below are shown on weights normalised to 100%. Use “Normalise to 100%” to rescale.
        </Callout>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel
          title="Fund weights"
          description="Drag a slider or type a weight. Changes are saved in this browser."
          actions={
            <span className={balanced ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-red-700"}>
              Total {total.toFixed(2)}%
            </span>
          }
        >
          <div className="divide-y divide-slate-100">
            {orderedSlots.map((s) => {
              const f = getFund(s.fundId)
              const p = m.positions.find((x) => x.key === s.slotId)
              return (
                <div key={s.slotId} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                  <div className="flex min-w-0 items-center gap-2">
                    <Swatch color={SLEEVE_COLORS[f.sleeve]} />
                    <div className="min-w-0">
                      <FundButton fund={f} className="block truncate text-sm" />
                      <div className="truncate text-[11px] text-slate-500">
                        {SLEEVE_LABELS[f.sleeve]} · {f.regTier === "base" ? "Base tier" : "C619 tier"}
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={0.5}
                    value={s.weight}
                    aria-label={`${f.shortName} weight`}
                    onChange={(e) => setSlotWeight(s.slotId, Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-slate-800"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-20 items-center rounded-md border border-slate-200 bg-white focus-within:border-slate-400">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={s.weight}
                        aria-label={`${f.shortName} weight percent`}
                        onChange={(e) => setSlotWeight(s.slotId, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-full min-w-0 bg-transparent pl-2 text-right text-sm tabular-nums outline-none"
                      />
                      <span className="pr-2 pl-0.5 text-xs text-slate-400">%</span>
                    </div>
                    <span className="w-16 text-right text-xs text-slate-500 tabular-nums">{money(p?.value ?? 0)}</span>
                    <button
                      type="button"
                      onClick={() => removeSlot(s.slotId)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${f.shortName}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <SelectField
              className="min-w-64 flex-1"
              label="Add a fund or base-tier instrument"
              value={addId}
              onChange={setAddId}
              options={[
                { value: "", label: "Select…" },
                ...available.map((f) => ({
                  value: f.id,
                  label: `${f.shortName}${f.phase3Score !== null ? ` (P3 ${f.phase3Score.toFixed(1)})` : ""}`,
                  group: SLEEVE_LABELS[f.sleeve],
                })),
              ]}
            />
            <Button
              size="sm"
              onClick={() => {
                if (!addId) return
                addSlot(addId, 0)
                setAddId("")
              }}
              disabled={!addId}
            >
              <Plus /> Add at 0%
            </Button>
          </div>
        </Panel>

        <div className="space-y-4 xl:sticky xl:top-20">
          <Panel title="Live portfolio metrics" description="Δ vs the recommended Core Growth 70/30">
            <StackBar segments={classSegments(m)} legend={false} height={14} />
            <div className="mt-3">
              <MetricLine label="Total allocation" value={`${total.toFixed(2)}%`} />
              <MetricLine label="Equity" value={fmtPct(m.equity)} delta={ppDelta(m.equity, rec.equity, "none")} provenance="calculated" />
              <MetricLine label="Fixed income" value={fmtPct(m.fixedIncome + m.baseTier)} delta={ppDelta(m.fixedIncome + m.baseTier, rec.fixedIncome + rec.baseTier, "none")} />
              <MetricLine label="Liquidity" value={fmtPct(m.liquidity)} delta={ppDelta(m.liquidity, rec.liquidity, "up")} />
              <MetricLine label="Sharia" value={fmtPct(m.sharia)} delta={ppDelta(m.sharia, rec.sharia, "none")} />
              <MetricLine
                label="Portfolio beta"
                value={fmtNum(m.beta)}
                delta={{ value: m.beta - rec.beta, display: Math.abs(m.beta - rec.beta) < 0.0005 ? "—" : fmtNum(m.beta - rec.beta, 3), goodWhen: "down" }}
                provenance="estimated"
              />
              <MetricLine label="Equity-sleeve beta" value={m.equitySleeveBeta === null ? "—" : fmtNum(m.equitySleeveBeta)} provenance="estimated" />
              <MetricLine
                label="Alpha proxy"
                value={fmtPP(m.alphaProxy)}
                delta={{ value: m.alphaProxy - rec.alphaProxy, display: Math.abs(m.alphaProxy - rec.alphaProxy) < 0.0005 ? "—" : fmtPP(m.alphaProxy - rec.alphaProxy), goodWhen: "up" }}
                provenance="estimated"
              />
              <MetricLine
                label="Expected return"
                value={fmtRate(m.expectedReturn, 2)}
                delta={{ value: m.expectedReturn - rec.expectedReturn, display: Math.abs(m.expectedReturn - rec.expectedReturn) < 0.0005 ? "—" : fmtPP(m.expectedReturn - rec.expectedReturn), goodWhen: "up" }}
                provenance="assumption"
              />
              <MetricLine label="Est. volatility" value={fmtRate(m.volatility)} provenance="assumption" />
              <MetricLine label="Largest holding" value={`${fmtPct(m.largest?.weight ?? 0)}`} delta={ppDelta(m.largest?.weight ?? 0, rec.largest?.weight ?? 0, "down")} />
              <MetricLine label="Top-5 concentration" value={fmtPct(m.top5)} delta={ppDelta(m.top5, rec.top5, "down")} />
              <MetricLine
                label="HHI (effective N)"
                value={`${Math.round(m.hhi)} (${fmtNum(m.effectiveN, 1)})`}
                delta={{ value: m.hhi - rec.hhi, display: Math.abs(m.hhi - rec.hhi) < 0.5 ? "—" : `${m.hhi > rec.hhi ? "+" : "−"}${Math.abs(Math.round(m.hhi - rec.hhi))}`, goodWhen: "down" }}
              />
              <MetricLine label="Est. annual fees" value={money(m.annualFees)} provenance="assumption" />
            </div>
          </Panel>

          <Panel title="Stress results">
            <RangeField
              label="Equity-market shock (shared with Stress testing)"
              value={state.stressShock}
              min={-50}
              max={30}
              step={1}
              onChange={(v) => set({ stressShock: v })}
              format={(v) => `${v > 0 ? "+" : ""}${v}%`}
            />
            <div className="mt-2">
              <MetricLine label="Beta-based" value={`${fmtRate(equityShock(m, state.stressShock, "beta"), 1, true)} · ${money((equityShock(m, state.stressShock, "beta") / 100) * m.value, { sign: true })}`} provenance="estimated" />
              <MetricLine label="Conservative 1:1" value={`${fmtRate(equityShock(m, state.stressShock, "one-to-one"), 1, true)} · ${money((equityShock(m, state.stressShock, "one-to-one") / 100) * m.value, { sign: true })}`} provenance="assumption" />
              <MetricLine label="Largest holding −30%" value={fmtRate(largestHoldingShock(m), 1, true)} />
              <MetricLine label="Rates +1%" value={fmtRate(rateShock(m, 1), 2, true)} provenance="estimated" />
            </div>
          </Panel>

          <Panel title="Regulatory exposure" description={`Circular 619 tier at B17 = ${money(state.b17)}`}>
            <CapacityGauge util={comp.util} tone={comp.tone} label={comp.label} size={220} />
            <div className="mt-2">
              <MetricLine label="C619 tier (of this portfolio)" value={fmtPct(m.c619)} />
              <MetricLine label="Base tier (of this portfolio)" value={fmtPct(m.base)} />
              <MetricLine label="Must migrate to base tier" value={money(comp.migration)} provenance="unconfirmed" />
            </div>
          </Panel>

          <Panel title="Policy limits">
            <LimitList checks={limitChecks(m, total)} />
          </Panel>
        </div>
      </div>
    </>
  )
}
