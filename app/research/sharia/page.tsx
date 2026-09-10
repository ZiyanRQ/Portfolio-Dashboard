"use client"

import Link from "next/link"

import { FUNDS, getFund, isShariaScreened } from "@/lib/data/funds"
import { LIMITS, PDF_FIGURES, PORTFOLIO_VALUE } from "@/lib/data/portfolio"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { applySharia } from "@/lib/model"
import { useDashboard } from "@/lib/store"
import { StackBar } from "@/components/dashboard/charts"
import { FundButton, sleeveSegments } from "@/components/dashboard/common"
import { Callout, Delta, Kpi, PageHeader, Panel, RangeField, Segmented, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

type Pref = "none" | "modest" | "material" | "full" | "custom"

export default function ShariaPage() {
  const { state, model, money, setSlots, setAssumption } = useDashboard()
  const m = model.proposed
  const rec = model.recommended
  const a = state.assumptions
  const equitySlots = state.slots.filter((s) => getFund(s.fundId).assetClass === "equity")
  const equityTotal = equitySlots.reduce((acc, s) => acc + s.weight, 0)
  const shariaSlotTotal = equitySlots.filter((s) => isShariaScreened(getFund(s.fundId))).reduce((acc, s) => acc + s.weight, 0)

  const PRESETS: Record<Exclude<Pref, "custom">, number> = { none: 0, modest: 5, material: LIMITS.maxPosition, full: equityTotal }
  const pref: Pref =
    (Object.keys(PRESETS) as Exclude<Pref, "custom">[]).find((k) => Math.abs(PRESETS[k] - shariaSlotTotal) < 0.01) ?? "custom"
  const apply = (v: number) => setSlots(applySharia(state.slots, v))

  const oppCost = (m.sharia * m.value * a.shariaShortfall) / 100
  const shariaFunds = FUNDS.filter((f) => f.sleeve === "sharia")
  const largestSharia = m.positions.filter((p) => isShariaScreened(p.fund)).sort((x, y) => y.weight - x.weight)[0]
  const nonShariaIncome = m.fixedIncome + m.liquidity + m.baseTier
  const notCertified = m.positions.filter((p) => p.fund.shariaStatus === "not-certified")

  return (
    <>
      <PageHeader
        eyebrow="Fund Research · Sharia analysis"
        title="Sharia allocation simulator"
        description="Sharia screening is treated as an optional trustee preference, not a binding constraint (B9): priced, not assumed. Changing the Sharia share moves weight to or from conventional equity pro-rata, keeping total equity unchanged."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Trustee preference">
          <div className="space-y-5">
            <Segmented<Pref>
              ariaLabel="Sharia preference"
              value={pref}
              onChange={(p) => p !== "custom" && apply(PRESETS[p])}
              options={[
                { value: "none", label: "None" },
                { value: "modest", label: "Modest" },
                { value: "material", label: "Material" },
                { value: "full", label: "Full" },
                ...(pref === "custom" ? [{ value: "custom" as const, label: "Custom" }] : []),
              ]}
            />
            <RangeField
              label="Sharia-screened allocation"
              value={shariaSlotTotal}
              min={0}
              max={Math.max(equityTotal, 1)}
              step={0.5}
              onChange={apply}
              format={(v) => `${v.toFixed(1)}%`}
              marks={[
                { value: 0, label: "0" },
                { value: 5, label: "5 (PDF)" },
                { value: LIMITS.maxPosition, label: "20" },
              ]}
            />
            <RangeField
              label="Expected-return shortfall of the Sharia sleeve"
              value={a.shariaShortfall}
              min={0}
              max={8}
              step={0.1}
              onChange={(v) => setAssumption("shariaShortfall", v)}
              format={(v) => `${v.toFixed(1)} pp`}
              hint="PDF §11: ~2 pp. Its printed rupee figures imply 4.7–5.7 pp (see note)."
            />
            <p className="text-[11px] leading-snug text-slate-500">
              Preference presets are dashboard conventions: Modest = the proposal&apos;s 5%; Material = 20%, the single-fund
              maximum (Tata Ethical is the only acceptable anchor today); Full = the entire equity sleeve.
            </p>
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Sharia exposure" value={fmtPct(m.sharia, 1)} sub={money(m.sharia * m.value)} provenance="calculated" />
            <Kpi label="Estimated opportunity cost" value={`${money(oppCost)} / yr`} sub={`${fmtNum(a.shariaShortfall, 1)} pp × Sharia sleeve`} provenance="assumption" />
            <Kpi
              label="Expected return"
              value={fmtRate(m.expectedReturn, 2)}
              sub={<Delta value={m.expectedReturn - rec.expectedReturn} display={`${fmtPP(m.expectedReturn - rec.expectedReturn, 2)} vs recommended`} goodWhen="up" />}
              provenance="assumption"
            />
            <Kpi
              label="Beta / alpha proxy"
              value={`${fmtNum(m.beta)} / ${fmtPP(m.alphaProxy)}`}
              sub={<Delta value={m.alphaProxy - rec.alphaProxy} display={`α ${fmtPP(m.alphaProxy - rec.alphaProxy)} vs recommended`} goodWhen="up" />}
              provenance="estimated"
            />
          </div>

          <Panel title="Portfolio weights after the change">
            <StackBar segments={sleeveSegments(m)} height={24} />
            <TableWrap className="mt-4">
              <thead>
                <tr>
                  <Th>Equity holding</Th>
                  <Th align="right">Weight</Th>
                  <Th align="right">Value</Th>
                  <Th>Screening</Th>
                </tr>
              </thead>
              <tbody>
                {m.positions
                  .filter((p) => p.fund.assetClass === "equity")
                  .map((p) => (
                    <tr key={p.key}>
                      <Td>
                        <FundButton fund={p.fund} />
                      </Td>
                      <Td align="right">{fmtPct(p.weight, 1)}</Td>
                      <Td align="right">{money(p.value)}</Td>
                      <Td>
                        {p.fund.shariaStatus === "supervised" ? (
                          <StatusPill tone="green" icon={false}>Shariah-screened · supervised</StatusPill>
                        ) : p.fund.shariaStatus === "unverified" ? (
                          <StatusPill tone="amber" icon={false}>Screened · supervisor unconfirmed</StatusPill>
                        ) : p.fund.shariaStatus === "not-certified" ? (
                          <StatusPill tone="red" icon={false}>Not certified Sharia</StatusPill>
                        ) : (
                          <span className="text-xs text-slate-500">Conventional</span>
                        )}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </TableWrap>
          </Panel>

          {nonShariaIncome > 0 && m.sharia > 0 && (
            <Callout tone="red" title="The portfolio as a whole is not Sharia-compliant">
              Only the {fmtPct(m.sharia, 1)} Sharia-screened equity sleeve is screened. The {fmtPct(nonShariaIncome, 0)} income and
              liquidity sleeves are conventional interest-bearing funds; a Sharia base tier would rely on a zero-interest current
              account satisfying s.35 and s.11(5)(iii) — assumption B10, currently unconfirmed.
            </Callout>
          )}
          {largestSharia && largestSharia.weight > LIMITS.maxPosition / 100 + 1e-9 && (
            <Callout tone="red" title={`${largestSharia.fund.shortName} exceeds the ${LIMITS.maxPosition}% maximum position`}>
              At {fmtPct(largestSharia.weight, 1)} it breaches the §21 hard limit. The Sharia universe has only one acceptable
              anchor today; Taurus could become a small secondary once S1/S2 are closed.
            </Callout>
          )}
          {notCertified.length > 0 && (
            <Callout tone="red" title="An ethical fund is not a Sharia fund">
              {notCertified.map((p) => p.fund.shortName).join(", ")} is an ethical mandate and names no Shariah board (S4). It is
              not counted in Sharia exposure.
            </Callout>
          )}
        </div>
      </div>

      <Panel title="The Sharia universe" description="Entire candidate set = four funds">
        <TableWrap>
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th align="right">P3</Th>
              <Th>Status</Th>
              <Th>Supervision / screen</Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {shariaFunds.map((f) => (
              <tr key={f.id}>
                <Td>
                  <FundButton fund={f} />
                  <div className="text-[11px] text-slate-500">{f.roleLabel}</div>
                </Td>
                <Td align="right" className="font-semibold">{f.phase3Score?.toFixed(1)}</Td>
                <Td>
                  <StatusPill tone={f.researchStatus === "selected" ? "green" : "red"} icon={false}>
                    {f.researchStatus === "selected" ? "Anchor (optional)" : "Not for now"}
                  </StatusPill>
                </Td>
                <Td className="max-w-md text-xs whitespace-normal text-slate-600">{f.shariaNote}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {f.flags.map((x) => (
                      <StatusPill key={x} tone="amber" icon={false} className="text-[10px]">
                        {x}
                      </StatusPill>
                    ))}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Callout tone="amber" title="Reconciliation note R2 — opportunity cost">
          The proposal prices the 5% sleeve at “~2 pp ≈ ₹1.5 L a year” and a fully Sharia corpus at “up to ~₹25 L”. On the
          stated inputs, 2 pp × 5% × ₹5.29 cr = {money(PORTFOLIO_VALUE * 0.05 * 0.02)}. The printed ₹1.5 L implies ~
          {((PDF_FIGURES.shariaCostPerYear / (PORTFOLIO_VALUE * 0.05)) * 100).toFixed(1)} pp, and ₹25 L on the whole corpus
          implies ~{((PDF_FIGURES.fullShariaCostPerYear / PORTFOLIO_VALUE) * 100).toFixed(1)} pp. The simulator uses the
          shortfall input above; confirm the intended figure.
        </Callout>
        <Callout tone="blue" title="Standards and definitions">
          Sharia screening is a religious-law screen (riba, gharar, sector exclusions) certified by a Shariah board; ESG /
          ethical screening is not equivalent. The funds apply a 4% interest-income screen; the stricter TASIS 2.5% default is a
          trustee choice to record (O9). Never describe a fund as Sharia-compliant beyond what its own named board certifies.{" "}
          <Link href="/governance/decisions" className="font-medium underline">
            Trustee decisions →
          </Link>
        </Callout>
      </div>
    </>
  )
}
