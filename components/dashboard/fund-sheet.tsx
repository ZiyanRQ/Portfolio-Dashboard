"use client"

import { COMPONENT_LABELS, getFund, riskBand, type ComponentKey, type Fund } from "@/lib/data/funds"
import { CURRENT_HOLDINGS } from "@/lib/data/portfolio"
import { SLEEVE_COLORS, SLEEVE_LABELS } from "@/lib/colors"
import { fmtNum, fmtPct, fmtPP, fmtRate } from "@/lib/format"
import { useDashboard, type Model } from "@/lib/store"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { NA, Provenance, StatusPill, Swatch, type Tone } from "@/components/dashboard/ui"

export function fundAction(fund: Fund, model: Model): { label: string; tone: Tone } {
  const held = CURRENT_HOLDINGS.find((h) => h.fundId === fund.id)
  const curW = held ? model.current.positions.find((p) => p.fund.id === fund.id)?.weight ?? 0 : 0
  const propW = model.proposed.positions.filter((p) => p.fund.id === fund.id).reduce((s, p) => s + p.weight, 0)
  if (held && propW === 0) return { label: "Exit", tone: "red" }
  if (held && propW < curW - 0.0005) return { label: `Trim ${fmtPct(curW, 1)} → ${fmtPct(propW, 0)}`, tone: "amber" }
  if (held && propW > curW + 0.0005) return { label: `Increase → ${fmtPct(propW, 0)}`, tone: "blue" }
  if (held) return { label: "Retain", tone: "neutral" }
  if (propW > 0) return { label: `Add ${fmtPct(propW, 0)}`, tone: "green" }
  if (fund.researchStatus === "bench") return { label: "Bench — not funded", tone: "neutral" }
  if (fund.researchStatus === "rejected") return { label: "Not recommended", tone: "red" }
  return { label: "Not held", tone: "neutral" }
}

const SHARIA_LABEL: Record<Fund["shariaStatus"], { label: string; tone: Tone }> = {
  supervised: { label: "Shariah-screened · named supervisor", tone: "green" },
  unverified: { label: "Shariah-screened · supervisor unconfirmed", tone: "amber" },
  "not-certified": { label: "Not certified Sharia", tone: "red" },
  conventional: { label: "Conventional (not screened)", tone: "neutral" },
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-800">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{title}</h4>
      <dl>{children}</dl>
    </div>
  )
}

export function FundProfile({ fund }: { fund: Fund }) {
  const { model, money } = useDashboard()
  const held = CURRENT_HOLDINGS.find((h) => h.fundId === fund.id)
  const cur = model.current.positions.find((p) => p.fund.id === fund.id)
  const prop = model.proposed.contributions.find((c) => c.fund.id === fund.id)
  const action = fundAction(fund, model)
  const sharia = SHARIA_LABEL[fund.shariaStatus]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill tone={action.tone}>{action.label}</StatusPill>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
          <Swatch color={SLEEVE_COLORS[fund.sleeve]} />
          {SLEEVE_LABELS[fund.sleeve]}
        </span>
        <StatusPill tone={fund.regTier === "base" ? "green" : "blue"} icon={false}>
          {fund.regTier === "base" ? "Base tier" : "Circular 619 tier"}
        </StatusPill>
      </div>

      <Section title="Performance & position">
        {held && cur ? (
          <>
            <Row label="Current value">
              {money(held.value)} · {fmtPct(cur.weight, 2)} <Provenance kind="measured" className="ml-1" />
            </Row>
            <Row label="Unrealised gain">
              {held.unrealisedGain === null ? (
                <NA reason="Not reported in the statement" />
              ) : (
                <>
                  {money(held.unrealisedGain, { sign: true })} ({fmtRate(held.unrealisedGainPct ?? 0, 2, true)})
                </>
              )}
            </Row>
            <Row label="IRR since purchase">
              {fmtRate(held.irr, 2)}
              {held.irrVsBenchmark !== null && (
                <span className="text-slate-500"> · {fmtPP(held.irrVsBenchmark)} vs benchmark</span>
              )}
            </Row>
            <Row label="Plan">Regular-Growth</Row>
          </>
        ) : (
          <Row label="Current holding">Not held</Row>
        )}
        <Row label="Proposed weight">
          {prop ? (
            <>
              {fmtPct(prop.weight, 1)} · {money(prop.value)} <span className="text-slate-500">Direct-Growth</span>
            </>
          ) : (
            "Not in the proposal"
          )}
        </Row>
      </Section>

      <Section title="Risk & return statistics">
        <Row label="3-yr alpha">
          {fund.alpha === null ? (
            <NA />
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {fmtPP(fund.alpha)} <Provenance kind={fund.alphaBetaAssumed ? "assumption" : "measured"} />
            </span>
          )}
        </Row>
        <Row label="3-yr beta">
          {fund.beta === null || fund.researchStatus === "instrument" ? (
            fund.researchStatus === "instrument" ? "0 (no equity-market exposure)" : <NA />
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {fmtNum(fund.beta)} {fund.betaBenchmark === "debt" && <span className="text-xs text-slate-500">vs debt benchmark</span>}
              <Provenance kind={fund.alphaBetaAssumed ? "assumption" : "measured"} />
            </span>
          )}
        </Row>
        {fund.alphaBetaNote && <p className="py-1 text-xs text-slate-500">{fund.alphaBetaNote}</p>}
        {prop && (
          <Row label="Contribution">
            {fmtPP(prop.alphaContribution, 3)} alpha · {fmtNum(prop.betaContribution, 3)} equity beta
          </Row>
        )}
        <Row label="Risk band">
          {riskBand(fund)} <span className="text-xs text-slate-400">(by category — not the SEBI riskometer)</span>
        </Row>
        <Row label="Duration">
          {fund.duration === null ? (
            fund.durationNote ?? <NA />
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {fmtNum(fund.duration)} yrs <Provenance kind={fund.durationEstimated ? "estimated" : "measured"} />
              {fund.durationNote && <span className="text-xs text-slate-500">{fund.durationNote}</span>}
            </span>
          )}
        </Row>
        <Row label="Credit quality">{fund.credit ? fund.credit.note : fund.assetClass === "equity" ? "n/a (equity)" : <NA />}</Row>
        <Row label="Foreign exposure">
          {fund.foreignPct === null ? <NA /> : <>{fmtRate(fund.foreignPct, 1)} {fund.foreignNote && <span className="text-xs text-slate-500">— {fund.foreignNote}</span>}</>}
        </Row>
        <Row label="Mid / small cap">
          {fund.midSmallPct === null ? <NA /> : <>{fmtRate(fund.midSmallPct, 0)} {fund.midSmallNote && <span className="text-xs text-slate-500">— {fund.midSmallNote}</span>}</>}
        </Row>
        <Row label="AUM">{fund.aumCr === null ? <NA /> : `~₹${fund.aumCr} cr`}</Row>
        <Row label="TER">
          <NA reason="Not disclosed per fund in the proposal" />
        </Row>
      </Section>

      <Section title="Phase 3 research">
        <Row label="Overall score">
          {fund.phase3Score === null ? <NA reason={fund.scoreNote ?? "Not scored"} /> : <span className="font-semibold">{fund.phase3Score.toFixed(1)} / 10</span>}
        </Row>
        {fund.scoreNote && fund.phase3Score !== null && <p className="py-1 text-xs text-slate-500">{fund.scoreNote}</p>}
        {(Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((k) => (
          <Row key={k} label={COMPONENT_LABELS[k]}>
            {fund.components[k] !== undefined ? (
              <span className="font-medium">{fund.components[k]}</span>
            ) : (
              <NA reason="Not reproduced in the proposal" />
            )}
          </Row>
        ))}
        <Row label="Role">{fund.roleLabel}</Row>
      </Section>

      <Section title="Legal classification">
        <Row label="Gate 1 (MPT Act)">{fund.gate1Basis}</Row>
        <Row label="Gate 2 (s.11(5))">{fund.gate2Basis}</Row>
        <Row label="Sharia">
          <StatusPill tone={sharia.tone} icon={false}>
            {sharia.label}
          </StatusPill>
          {fund.shariaNote && <p className="mt-1 text-xs text-slate-500">{fund.shariaNote}</p>}
        </Row>
      </Section>

      <Section title="Role, rationale & monitoring">
        <Row label="Rationale">{fund.rationale}</Row>
        <Row label="Monitoring">{fund.monitoring}</Row>
        {fund.flags.length > 0 && (
          <Row label="Flags">
            <div className="flex flex-wrap gap-1">
              {fund.flags.map((f) => (
                <StatusPill key={f} tone="amber" icon={false}>
                  {f}
                </StatusPill>
              ))}
            </div>
          </Row>
        )}
        <Row label="Source">PDF {fund.source}</Row>
      </Section>
    </div>
  )
}

export function FundSheet() {
  const { state, openFund } = useDashboard()
  const fund = state.openFundId ? getFund(state.openFundId) : null
  return (
    <Sheet open={fund !== null} onOpenChange={(open) => !open && openFund(null)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg data-[side=right]:sm:max-w-lg">
        {fund && (
          <>
            <SheetHeader className="border-b border-slate-100 pr-12">
              <SheetTitle className="text-lg font-semibold">{fund.name}</SheetTitle>
              <SheetDescription>
                {fund.category} · {fund.amc}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-8">
              <FundProfile fund={fund} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
