"use client"

import Link from "next/link"

import { SLEEVE_COLORS, SLEEVE_LABELS, SLEEVE_ORDER } from "@/lib/colors"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { StackBar } from "@/components/dashboard/charts"
import { classSegments, clauseLabel, FundButton, limitChecks, LimitList, sleeveSegments } from "@/components/dashboard/common"
import { Button } from "@/components/ui/button"
import { Callout, Kpi, NA, PageHeader, Panel, Provenance, Swatch, TableWrap, Td, Th } from "@/components/dashboard/ui"

export default function ProposedPortfolioPage() {
  const { model, money, resetSlots } = useDashboard()
  const m = model.proposed
  const comp = model.compliance.proposed

  return (
    <>
      <PageHeader
        eyebrow="Portfolio · Proposed"
        title="Core Growth 70/30"
        description="Nine funds, all Direct-Growth: 70% equity and 30% income / liquidity, with one Sharia fund as an optional preference. Built for a return-seeking mandate whose safe ballast is assumed to sit in the base tier held elsewhere (B17)."
        actions={
          model.modified ? (
            <Button variant="outline" size="sm" onClick={resetSlots}>
              Reset to recommended portfolio
            </Button>
          ) : undefined
        }
      />

      {model.modified && (
        <Callout tone="amber" title="Showing your modified proposal">
          Weights or funds were changed in the Builder, Substitution tool or Sharia simulator. Every page uses this version.{" "}
          <Link href="/portfolio/builder" className="font-medium underline">
            Open the builder
          </Link>
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Equity / income / liquidity" value={`${fmtPct(m.equity, 0)} / ${fmtPct(m.fixedIncome, 0)} / ${fmtPct(m.liquidity, 0)}`} provenance="calculated" />
        <Kpi label="Whole-portfolio beta" value={`~${fmtNum(m.beta)}`} sub={`Equity sleeve ~${m.equitySleeveBeta === null ? "—" : fmtNum(m.equitySleeveBeta)}`} provenance="estimated" />
        <Kpi label="Alpha proxy" value={fmtPP(m.alphaProxy)} provenance="estimated" />
        <Kpi label="Expected return" value={`~${fmtRate(m.expectedReturn)}`} sub="Illustrative, net of Direct costs" provenance="assumption" />
        <Kpi label="Largest holding" value={fmtPct(m.largest?.weight ?? 0, 0)} sub={m.largest?.fund.shortName} provenance="calculated" />
        <Kpi
          label="C619 utilisation"
          value={fmtPct(comp.util, 1)}
          sub="Of total trust money at the B17 input"
          provenance="unconfirmed"
          tone={comp.tone}
          href="/legal/b17"
        />
      </div>

      <Panel title="Allocation by portfolio role">
        <StackBar segments={sleeveSegments(m)} height={26} />
      </Panel>

      <Panel title="Holdings by sleeve" description="Click a fund to open its full profile.">
        <TableWrap>
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th align="right">Target</Th>
              <Th align="right">Value</Th>
              <Th align="right">Alpha</Th>
              <Th align="right">Beta</Th>
              <Th align="right">α contrib.</Th>
              <Th align="right">β contrib.</Th>
              <Th>Role</Th>
              <Th align="right">P3 score</Th>
              <Th>Legal status</Th>
              <Th>Key monitoring requirement</Th>
            </tr>
          </thead>
          {SLEEVE_ORDER.filter((s) => m.bySleeve[s] > 0).map((sleeve) => {
            const rows = m.contributions.filter((c) => c.fund.sleeve === sleeve)
            return (
              <tbody key={sleeve}>
                <tr className="bg-slate-50/80">
                  <td colSpan={11} className="border-b border-slate-200 px-0 py-1.5">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Swatch color={SLEEVE_COLORS[sleeve]} />
                      {SLEEVE_LABELS[sleeve]} · {fmtPct(m.bySleeve[sleeve], 1)} · {money(m.bySleeve[sleeve] * m.value)}
                    </span>
                  </td>
                </tr>
                {rows.map((c) => (
                  <tr key={c.key} className="hover:bg-slate-50/70">
                    <Td>
                      <FundButton fund={c.fund} />
                      <div className="text-xs text-slate-500">{c.fund.category}</div>
                    </Td>
                    <Td align="right">{fmtPct(c.weight, 1)}</Td>
                    <Td align="right">{money(c.value)}</Td>
                    <Td align="right">
                      {c.fund.alpha === null ? <NA /> : fmtPP(c.fund.alpha)}
                      {c.pdfAssumed && <span className="ml-0.5 text-slate-400">*</span>}
                    </Td>
                    <Td align="right">
                      {c.fund.beta === null ? <NA /> : fmtNum(c.fund.beta)}
                      {c.fund.betaBenchmark === "debt" && <span className="ml-0.5 text-slate-400">**</span>}
                    </Td>
                    <Td align="right">{fmtPP(c.alphaContribution, 3)}</Td>
                    <Td align="right">{fmtNum(c.betaContribution, 3)}</Td>
                    <Td className="text-xs">{c.fund.roleLabel}</Td>
                    <Td align="right">{c.fund.phase3Score === null ? <NA reason="Not scored" /> : c.fund.phase3Score.toFixed(1)}</Td>
                    <Td className="text-xs">{clauseLabel(c.fund)} · 17C(i)</Td>
                    <Td className="max-w-72 text-xs whitespace-normal text-slate-600">{c.fund.monitoring}</Td>
                  </tr>
                ))}
              </tbody>
            )
          })}
          <tbody>
            <tr className="font-semibold">
              <Td>Total</Td>
              <Td align="right">{fmtPct(1, 0)}</Td>
              <Td align="right">{money(m.value)}</Td>
              <Td />
              <Td />
              <Td align="right">{fmtPP(m.alphaProxy, 3)}</Td>
              <Td align="right">{fmtNum(m.beta, 3)}</Td>
              <Td colSpan={4} />
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-xs text-slate-500">
          * Nifty 50 tracker alpha 0 / beta 1.00 are assumptions before tracking difference (no tracker selected yet). **
          Debt-fund betas are measured against debt benchmarks and are not added to equity beta — debt and liquid sleeves
          contribute ≈ 0. Mechanically averaging all betas gives ~0.92, which has no coherent market interpretation.
          {m.placeholders.length > 0 && (
            <> Placeholder beta 1.00 / alpha 0 used for undisclosed figures: {m.placeholders.join(", ")}.</>
          )}
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="By asset class & regulatory tier">
          <StackBar segments={classSegments(m)} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 p-2.5">
              <div className="text-slate-500">Base tier (in portfolio)</div>
              <div className="text-base font-semibold text-slate-900">{fmtPct(m.base, 0)}</div>
            </div>
            <div className="rounded-md bg-slate-50 p-2.5">
              <div className="text-slate-500">Circular 619 tier</div>
              <div className="text-base font-semibold text-slate-900">{fmtPct(m.c619, 0)}</div>
            </div>
          </div>
        </Panel>
        <Panel title="Policy limit checks" description="§20 and §21" className="lg:col-span-1">
          <LimitList checks={limitChecks(m, model.slotsTotal)} />
        </Panel>
        <Panel title="Compliance verification">
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Circular 619 utilisation is {fmtPct(m.c619, 0)} of this portfolio. That satisfies the 45% working and 50%
              hard ceilings only at the total-trust-money level, and only if B17 holds.
            </p>
            <p className="flex flex-wrap items-center gap-1.5">
              Breakeven B17: <strong>{money(comp.breakeven)}</strong> <Provenance kind="calculated" />
            </p>
            <Link href="/legal/b17" className="text-xs font-medium text-blue-700 hover:underline">
              Test it in the B17 simulator →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  )
}
