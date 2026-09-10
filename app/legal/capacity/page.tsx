"use client"

import Link from "next/link"

import { PORTFOLIO_VALUE } from "@/lib/data/portfolio"
import { fmtPct } from "@/lib/format"
import { PORTFOLIO_LABELS, type PortfolioKey } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { CapacityGauge } from "@/components/dashboard/charts"
import { clauseLabel, FundButton } from "@/components/dashboard/common"
import { Callout, PageHeader, Panel, RangeField, Segmented, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const KEYS: PortfolioKey[] = ["current", "proposed", "fallback"]

export default function CapacityPage() {
  const { model, state, set, money } = useDashboard()
  const key = state.portfolioView
  const m = model.byKey[key]
  const c = model.compliance[key]
  const a = state.assumptions

  return (
    <>
      <PageHeader
        eyebrow="Legal & Compliance · Circular 619 capacity"
        title="Regulatory capacity gauge"
        description="Circular 619-tier holdings at market value as a share of total trust money (this portfolio + qualifying base-tier assets held elsewhere). Updates with B17, the portfolio chosen, and every builder change."
        actions={
          <Segmented<PortfolioKey>
            ariaLabel="Portfolio"
            value={key}
            onChange={(v) => set({ portfolioView: v })}
            options={KEYS.map((k) => ({ value: k, label: PORTFOLIO_LABELS[k] }))}
          />
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={`${PORTFOLIO_LABELS[key]} portfolio`} description={c.label}>
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
            <CapacityGauge util={c.util} tone={c.tone} size={320} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-2.5">
                <dt className="text-xs text-slate-500">Circular 619 exposure</dt>
                <dd className="font-semibold text-slate-900">{money(c.c619Amount)}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-2.5">
                <dt className="text-xs text-slate-500">Total trust money</dt>
                <dd className="font-semibold text-slate-900">{money(c.total)}</dd>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
                <dt className="text-xs text-amber-900">45% working ceiling</dt>
                <dd className="font-semibold text-slate-900">{money(c.workingCap)}</dd>
                <dd className="text-[11px] text-amber-900">Headroom {money(c.headroomWorking, { sign: true })}</dd>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 p-2.5">
                <dt className="text-xs text-red-800">50% legal ceiling</dt>
                <dd className="font-semibold text-slate-900">{money(c.legalCap)}</dd>
                <dd className="text-[11px] text-red-800">Headroom {money(c.headroomLegal, { sign: true })}</dd>
              </div>
              <div className="col-span-2 rounded-md bg-slate-50 p-2.5">
                <dt className="text-xs text-slate-500">Migration to base tier needed to reach the working ceiling</dt>
                <dd className="font-semibold text-slate-900">{money(c.migration)}</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="What moves the gauge">
          <RangeField
            label="Qualifying base-tier assets held elsewhere (B17)"
            value={state.b17}
            min={0}
            max={120_000_000}
            step={500_000}
            onChange={(v) => set({ b17: v })}
            format={(v) => money(v)}
            hint="Shared with the B17 simulator."
          />
          <ul className="mt-4 space-y-2 text-xs text-slate-600">
            <li>
              <strong>Portfolio composition:</strong> any fund is Circular 619 tier; direct G-Secs and bank deposits are base
              tier. <Link href="/portfolio/builder" className="text-blue-700 hover:underline">Change it in the builder →</Link>
            </li>
            <li>
              <strong>Market moves:</strong> the cap is tested continuously at market value (B3) — an equity rally raises
              utilisation.
            </li>
            <li>
              <strong>Denominator (B4):</strong> “trust money” is read as investable financial assets, not land and buildings.
            </li>
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {KEYS.map((k) => (
          <Panel key={k} title={PORTFOLIO_LABELS[k]} actions={<StatusPill tone={model.compliance[k].tone}>{fmtPct(model.compliance[k].util, 1)}</StatusPill>}>
            <CapacityGauge util={model.compliance[k].util} tone={model.compliance[k].tone} size={220} />
            <p className="mt-1 text-center text-xs text-slate-500">{model.compliance[k].label}</p>
          </Panel>
        ))}
      </div>

      <Panel title={`Tier breakdown — ${PORTFOLIO_LABELS[key]}`}>
        <TableWrap>
          <thead>
            <tr>
              <Th>Holding</Th>
              <Th>Tier / basis</Th>
              <Th align="right">Value</Th>
              <Th align="right">% of portfolio</Th>
              <Th align="right">% of total trust money</Th>
            </tr>
          </thead>
          <tbody>
            {m.positions.map((p) => (
              <tr key={p.key}>
                <Td>
                  <FundButton fund={p.fund} />
                </Td>
                <Td>
                  <StatusPill tone={p.fund.regTier === "base" ? "green" : "blue"} icon={false}>
                    {clauseLabel(p.fund)}
                  </StatusPill>
                </Td>
                <Td align="right">{money(p.value)}</Td>
                <Td align="right">{fmtPct(p.weight, 1)}</Td>
                <Td align="right">{fmtPct(p.value / c.total, 1)}</Td>
              </tr>
            ))}
            {state.b17 > 0 && (
              <tr>
                <Td className="text-slate-600">Qualifying base-tier assets held elsewhere (B17)</Td>
                <Td>
                  <StatusPill tone="green" icon={false}>Base tier</StatusPill>
                </Td>
                <Td align="right">{money(state.b17)}</Td>
                <Td align="right">—</Td>
                <Td align="right">{fmtPct(state.b17 / c.total, 1)}</Td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Panel>

      <Callout tone="amber" title="45% is a management buffer; 50% is the legal ceiling">
        Above {a.workingCeiling}% the policy requires rebalancing back toward target; above {a.legalCeiling}% a breach must be
        remediated without delay (§21). Amber starts {a.amberBand} pp below the working ceiling. On the ₹5.29 cr denominator
        alone the 50% ceiling is {money(PORTFOLIO_VALUE * 0.5)} and the 45% working ceiling {money(PORTFOLIO_VALUE * 0.45)}.
      </Callout>
    </>
  )
}
