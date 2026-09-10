"use client"

import { SLEEVE_COLORS } from "@/lib/colors"
import { fmtNum, fmtPct } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { CapacityGauge, HBars, Meter, StackBar } from "@/components/dashboard/charts"
import { FundButton, sleeveSegments } from "@/components/dashboard/common"
import { Callout, Kpi, PageHeader, Panel, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

export default function ProgressPage() {
  const { model, state, money, openFund } = useDashboard()
  const t = model.transition
  const actual = model.transitionMetrics
  const target = state.implementationTarget === "fallback" ? model.fallback : model.proposed
  const comp = model.transitionCompliance

  return (
    <>
      <PageHeader
        eyebrow="Implementation · Progress"
        title="Transition progress"
        description="The actual allocation after the actions marked complete, against the start point and the target."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Progress by value" value={fmtPct(t.valueProgress, 0)} sub={<Meter value={t.valueProgress} className="mt-1" />} provenance="calculated" />
        <Kpi label="Actions complete" value={`${t.completed} / ${model.actions.length}`} sub={<Meter value={t.countProgress} className="mt-1" />} provenance="calculated" />
        <Kpi label="Cash awaiting reinvestment" value={money(t.cash)} sub="Bank account (base tier)" provenance="calculated" tone={t.cash > 0 ? "amber" : undefined} />
        <Kpi label="Regular-plan exposure left" value={fmtPct(actual.regularWeight, 0)} provenance="calculated" tone={actual.regularWeight > 0 ? "amber" : "green"} />
        <Kpi label="Actual equity / beta" value={`${fmtPct(actual.equity, 0)} / ${fmtNum(actual.beta)}`} provenance="estimated" />
        <Kpi label="C619 utilisation now" value={fmtPct(comp.util, 1)} sub={`At B17 = ${money(state.b17)}`} provenance="unconfirmed" tone={comp.tone} />
      </div>

      {t.fundingGap > 0 && (
        <Callout tone="red" title="Funding gap">
          Completed purchases exceed completed sales by {money(t.fundingGap)}.
        </Callout>
      )}

      <Panel title="Allocation: start → now → target" description="Colour follows the sleeve; transition cash counts as liquidity">
        <div className="space-y-4">
          {[
            ["Start (current)", model.current],
            ["Now (actual)", actual],
            [`Target (${state.implementationTarget === "fallback" ? "compliance fallback" : "proposed"})`, target],
          ].map(([label, m]) => (
            <div key={label as string}>
              <div className="mb-1.5 text-xs font-semibold text-slate-700">{label as string}</div>
              <StackBar segments={sleeveSegments(m as typeof actual)} height={20} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Actual holdings">
          <TableWrap>
            <thead>
              <tr>
                <Th>Holding</Th>
                <Th align="right">Value</Th>
                <Th align="right">Weight</Th>
                <Th align="right">Target</Th>
                <Th>Plan</Th>
              </tr>
            </thead>
            <tbody>
              {actual.sorted.map((p) => {
                const tgt = target.positions.filter((x) => x.fund.id === p.fund.id).reduce((s, x) => s + x.weight, 0)
                return (
                  <tr key={p.key}>
                    <Td>
                      <FundButton fund={p.fund} />
                    </Td>
                    <Td align="right">{money(p.value)}</Td>
                    <Td align="right">{fmtPct(p.weight, 1)}</Td>
                    <Td align="right">{p.fund.id === "cash-pending" ? "0%" : fmtPct(tgt, 1)}</Td>
                    <Td>
                      <StatusPill tone={p.plan === "Regular" ? "amber" : "green"} icon={false}>
                        {p.plan}
                      </StatusPill>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        </Panel>
        <Panel title="Circular 619 during transition">
          <CapacityGauge util={comp.util} tone={comp.tone} label={comp.label} size={260} />
          <p className="mt-2 text-xs text-slate-500">
            Sale proceeds held in the bank are base tier, so utilisation dips between the sell and buy legs.
          </p>
        </Panel>
      </div>

      <Panel title="Distance to target by holding" description="Actual weight minus target weight">
        <HBars
          rows={target.sorted.map((p) => {
            const now = actual.positions.filter((x) => x.fund.id === p.fund.id).reduce((s, x) => s + x.weight, 0)
            return {
              key: p.key,
              label: p.fund.shortName,
              value: now,
              display: `${fmtPct(now, 1)} / ${fmtPct(p.weight, 0)}`,
              color: SLEEVE_COLORS[p.fund.sleeve],
              onClick: () => openFund(p.fund.id),
            }
          })}
          max={0.6}
        />
      </Panel>
    </>
  )
}
