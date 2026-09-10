"use client"

import { useMemo, useState } from "react"
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"

import { COMPONENT_LABELS, isShariaScreened, RESEARCH_UNIVERSE, riskBand, type ComponentKey, type Fund } from "@/lib/data/funds"
import { CHART } from "@/lib/colors"
import { fmtNum, fmtPP } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ChartFrame } from "@/components/dashboard/charts"
import { FundButton } from "@/components/dashboard/common"
import { fundAction } from "@/components/dashboard/fund-sheet"
import { Callout, NA, NumberField, PageHeader, Panel, RangeField, Segmented, SelectField, StatusPill, TableWrap, Td, Th, type Tone } from "@/components/dashboard/ui"

type Status = "selected" | "bench" | "rejected"
const STATUS_COLOR: Record<Status, string> = { selected: "#2a78d6", bench: "#eb6834", rejected: "#1baf7a" }
const STATUS_LABEL: Record<Status, string> = { selected: "Selected", bench: "Bench", rejected: "Rejected / not for now" }
const STATUS_TONE: Record<Status, Tone> = { selected: "green", bench: "neutral", rejected: "red" }
const RISK_ORD: Record<ReturnType<typeof riskBand>, number> = { Low: 1, "Low–moderate": 2, Moderate: 3, High: 4, "Very high": 5 }
const COMPONENT_SHORT: Record<ComponentKey, string> = {
  returnQuality: "Return",
  risk: "Risk",
  diversification: "Divers.",
  costEfficiency: "Cost",
  liquidity: "Liquidity",
  governance: "Govern.",
  legalCompliance: "Legal",
  shariaCompatibility: "Sharia",
}

type AxisKey = "score" | "risk" | "alpha" | "beta" | "duration" | "foreign" | "midSmall" | "aum"
const AXES: Record<AxisKey, { label: string; get: (f: Fund) => number | null; fmt: (v: number) => string }> = {
  score: { label: "Phase 3 overall score", get: (f) => f.phase3Score, fmt: (v) => v.toFixed(1) },
  risk: { label: "Risk band (by category, 1 low – 5 very high)", get: (f) => RISK_ORD[riskBand(f)], fmt: (v) => ["", "Low", "Low–mod", "Moderate", "High", "Very high"][Math.round(v)] ?? "" },
  alpha: { label: "3-yr alpha (pp)", get: (f) => f.alpha, fmt: (v) => fmtPP(v) },
  beta: { label: "3-yr equity beta", get: (f) => (f.betaBenchmark === "equity" ? f.beta : null), fmt: (v) => fmtNum(v) },
  duration: { label: "Duration (yrs)", get: (f) => f.duration, fmt: (v) => fmtNum(v, 1) },
  foreign: { label: "Foreign exposure (%)", get: (f) => f.foreignPct, fmt: (v) => `${v}%` },
  midSmall: { label: "Mid + small cap (%)", get: (f) => f.midSmallPct, fmt: (v) => `${v}%` },
  aum: { label: "AUM (₹ cr)", get: (f) => f.aumCr, fmt: (v) => `₹${v} cr` },
}

type Preset = "risk-score" | "beta-alpha" | "return-vol" | "custom"

function statusOf(f: Fund): Status {
  return f.researchStatus === "selected" ? "selected" : f.researchStatus === "bench" ? "bench" : "rejected"
}

// Small deterministic jitter so funds on an ordinal axis do not overlap.
function jitter(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997
  return ((h / 997) - 0.5) * 0.36
}

interface ScatterPoint {
  x: number
  y: number
  id: string
  name: string
  status: Status
}

function ScatterTip({ active, payload, xKey, yKey }: { active?: boolean; payload?: ReadonlyArray<{ payload?: ScatterPoint }>; xKey: AxisKey; yKey: AxisKey }) {
  const p = payload?.[0]?.payload
  if (!active || !p) return null
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-slate-900">{p.name}</div>
      <div className="text-slate-500">{STATUS_LABEL[p.status]}</div>
      <div className="mt-1 tabular-nums text-slate-700">
        {AXES[xKey].label.split(" (")[0]}: {AXES[xKey].fmt(xKey === "risk" ? Math.round(p.x) : p.x)}
      </div>
      <div className="tabular-nums text-slate-700">
        {AXES[yKey].label.split(" (")[0]}: {AXES[yKey].fmt(yKey === "risk" ? Math.round(p.y) : p.y)}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">Click to open the profile</div>
    </div>
  )
}

export default function ExplorerPage() {
  const { model, openFund } = useDashboard()
  const [category, setCategory] = useState("all")
  const [minScore, setMinScore] = useState(0)
  const [risk, setRisk] = useState("all")
  const [ter, setTer] = useState("any")
  const [minAum, setMinAum] = useState(0)
  const [legal, setLegal] = useState("all")
  const [sharia, setSharia] = useState("all")
  const [status, setStatus] = useState<"all" | Status>("all")
  const [preset, setPreset] = useState<Preset>("risk-score")
  const [xKey, setXKey] = useState<AxisKey>("risk")
  const [yKey, setYKey] = useState<AxisKey>("score")

  const categories = [...new Set(RESEARCH_UNIVERSE.map((f) => f.category))].sort()

  const funds = useMemo(
    () =>
      RESEARCH_UNIVERSE.filter((f) => {
        if (category !== "all" && f.category !== category) return false
        if (minScore > 0 && (f.phase3Score === null || f.phase3Score < minScore)) return false
        if (risk !== "all" && riskBand(f) !== risk) return false
        if (ter === "disclosed") return false // TER is not disclosed per fund in the proposal
        if (minAum > 0 && (f.aumCr === null || f.aumCr < minAum)) return false
        if (legal === "10" && f.components.legalCompliance !== 10) return false
        if (sharia === "screened" && !isShariaScreened(f)) return false
        if (sharia === "conventional" && f.shariaStatus !== "conventional") return false
        if (sharia === "not-certified" && f.shariaStatus !== "not-certified") return false
        if (status !== "all" && statusOf(f) !== status) return false
        return true
      }),
    [category, minScore, risk, ter, minAum, legal, sharia, status]
  )

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p === "risk-score") {
      setXKey("risk")
      setYKey("score")
    } else if (p === "beta-alpha") {
      setXKey("beta")
      setYKey("alpha")
    }
  }

  const points: ScatterPoint[] = funds.flatMap((f) => {
    const x = AXES[xKey].get(f)
    const y = AXES[yKey].get(f)
    if (x === null || y === null) return []
    return [{ x: xKey === "risk" ? x + jitter(f.id) : x, y: yKey === "risk" ? y + jitter(f.id + "y") : y, id: f.id, name: f.shortName, status: statusOf(f) }]
  })

  const Dot = (props: unknown) => {
    const { cx = 0, cy = 0, fill, payload } = props as { cx?: number; cy?: number; fill?: string; payload?: ScatterPoint }
    return (
      <g onClick={() => payload && openFund(payload.id)} style={{ cursor: "pointer" }}>
        <circle cx={cx} cy={cy} r={12} fill="transparent" />
        <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={2} />
      </g>
    )
  }

  const tableView = (
    <TableWrap>
      <thead>
        <tr>
          <Th>Fund</Th>
          <Th>Category</Th>
          <Th>Status</Th>
          <Th align="right">P3</Th>
          {(Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((k) => (
            <Th key={k} align="center">
              <span title={COMPONENT_LABELS[k]}>{COMPONENT_SHORT[k]}</span>
            </Th>
          ))}
          <Th>Risk band</Th>
          <Th align="right">Alpha</Th>
          <Th align="right">Beta</Th>
          <Th>Proposal</Th>
        </tr>
      </thead>
      <tbody>
        {funds.map((f) => {
          const s = statusOf(f)
          const act = fundAction(f, model)
          return (
            <tr key={f.id} className="hover:bg-slate-50/70">
              <Td>
                <FundButton fund={f} />
              </Td>
              <Td className="text-xs">{f.category}</Td>
              <Td>
                <StatusPill tone={STATUS_TONE[s]} icon={false}>
                  {STATUS_LABEL[s]}
                </StatusPill>
              </Td>
              <Td align="right" className="font-semibold text-slate-900">
                {f.phase3Score === null ? <NA reason="n/s" /> : `${f.phase3Score.toFixed(1)}${f.scoreNote ? "*" : ""}`}
              </Td>
              {(Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((k) => (
                <Td key={k} align="center" className={cn("text-xs", f.components[k] === undefined && "text-slate-300")}>
                  <span title={f.components[k] === undefined ? "Not reproduced in the proposal" : COMPONENT_LABELS[k]}>
                    {f.components[k] ?? "–"}
                  </span>
                </Td>
              ))}
              <Td className="text-xs">{riskBand(f)}</Td>
              <Td align="right">{f.alpha === null ? <span className="text-slate-300">–</span> : fmtPP(f.alpha)}</Td>
              <Td align="right">{f.beta === null ? <span className="text-slate-300">–</span> : `${fmtNum(f.beta)}${f.betaBenchmark === "debt" ? "ᵈ" : ""}`}</Td>
              <Td>
                <StatusPill tone={act.tone} icon={false} className="text-[11px]">
                  {act.label}
                </StatusPill>
              </Td>
            </tr>
          )
        })}
      </tbody>
    </TableWrap>
  )

  return (
    <>
      <PageHeader
        eyebrow="Fund Research · Candidate explorer"
        title="Phase 3 candidate universe"
        description="22 funds scored on one identical methodology across eight components, plus the unscored Nifty 50 tracker. Legality narrowed the field by nothing — all 22 score Legal Compliance 10 — so selection is about suitability and quality."
      />

      <Panel title="Filters" description="Scope every chart and table below">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SelectField label="Fund category" value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <RangeField label="Minimum P3 score" value={minScore} min={0} max={10} step={0.1} onChange={setMinScore} format={(v) => (v === 0 ? "Any" : v.toFixed(1))} />
          <SelectField label="Risk band" value={risk} onChange={setRisk} options={[{ value: "all", label: "All" }, ...Object.keys(RISK_ORD).map((r) => ({ value: r, label: r }))]} />
          <SelectField label="TER" value={ter} onChange={setTer} options={[{ value: "any", label: "Any" }, { value: "disclosed", label: "Disclosed TER only" }]} />
          <NumberField label="Minimum AUM" value={minAum || null} placeholder="Any" onChange={(v) => setMinAum(Math.max(0, v))} suffix="₹ cr" />
          <SelectField label="Legal compliance" value={legal} onChange={setLegal} options={[{ value: "all", label: "All" }, { value: "10", label: "Scores 10 (both gates)" }]} />
          <SelectField label="Sharia status" value={sharia} onChange={setSharia} options={[{ value: "all", label: "All" }, { value: "screened", label: "Shariah-screened" }, { value: "not-certified", label: "Ethical, not certified" }, { value: "conventional", label: "Conventional" }]} />
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-600">Selected / Bench / Rejected</div>
            <Segmented<"all" | Status>
              size="xs"
              ariaLabel="Research status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "selected", label: "Sel." },
                { value: "bench", label: "Bench" },
                { value: "rejected", label: "Rej." },
              ]}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {funds.length} of {RESEARCH_UNIVERSE.length} funds shown. TER is not disclosed per fund in the proposal (so “Disclosed
          TER only” returns none), and AUM is disclosed only for Taurus Ethical (~₹402 cr) — funds without data are excluded
          when those filters are set. Risk band is derived from category, not the SEBI riskometer.
        </p>
      </Panel>

      <Panel
        title="Scatter explorer"
        description="Each point is a fund. Click a point for the full profile."
        actions={
          <Segmented<Preset>
            size="xs"
            ariaLabel="Chart"
            value={preset}
            onChange={choosePreset}
            options={[
              { value: "risk-score", label: "Risk vs score" },
              { value: "beta-alpha", label: "Beta vs alpha" },
              { value: "return-vol", label: "Return vs volatility" },
              { value: "custom", label: "Custom" },
            ]}
          />
        }
      >
        {preset === "custom" && (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <SelectField label="X axis" value={xKey} onChange={(v) => setXKey(v as AxisKey)} options={(Object.keys(AXES) as AxisKey[]).map((k) => ({ value: k, label: AXES[k].label }))} />
            <SelectField label="Y axis" value={yKey} onChange={(v) => setYKey(v as AxisKey)} options={(Object.keys(AXES) as AxisKey[]).map((k) => ({ value: k, label: AXES[k].label }))} />
          </div>
        )}
        {preset === "return-vol" ? (
          <Callout tone="neutral" title="Not available">
            Fund-level return and volatility series are not reproduced in the proposal, so a return-vs-volatility chart cannot be
            drawn without inventing data. It becomes available once the monthly NAV series (open item O10) is compiled.
          </Callout>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex gap-3">
                {(Object.keys(STATUS_COLOR) as Status[]).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} /> {STATUS_LABEL[s]}
                  </span>
                ))}
              </div>
              <span className="text-slate-500">
                Showing {points.length} of {funds.length} funds with data on both axes
                {xKey === "beta" || yKey === "beta" ? " · debt-fund betas excluded (debt benchmarks)" : ""}
              </span>
            </div>
            <ChartFrame
              chart={
                <ResponsiveContainer width="100%" height={340} initialDimension={{ width: 800, height: 340 }}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid stroke={CHART.grid} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={AXES[xKey].label}
                      domain={xKey === "risk" ? [0.5, 5.5] : ["auto", "auto"]}
                      ticks={xKey === "risk" ? [1, 2, 3, 4, 5] : undefined}
                      tickFormatter={(v: number) => AXES[xKey].fmt(v)}
                      tick={{ fontSize: 11, fill: CHART.muted }}
                      tickLine={false}
                      axisLine={{ stroke: CHART.axis }}
                      label={{ value: AXES[xKey].label, position: "insideBottom", offset: -12, fontSize: 11, fill: CHART.muted }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={AXES[yKey].label}
                      domain={yKey === "score" ? [3, 10] : yKey === "risk" ? [0.5, 5.5] : ["auto", "auto"]}
                      tickFormatter={(v: number) => AXES[yKey].fmt(v)}
                      tick={{ fontSize: 11, fill: CHART.muted }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip cursor={false} content={<ScatterTip xKey={xKey} yKey={yKey} />} />
                    {(Object.keys(STATUS_COLOR) as Status[]).map((s) => (
                      <Scatter key={s} name={STATUS_LABEL[s]} data={points.filter((p) => p.status === s)} fill={STATUS_COLOR[s]} shape={Dot} isAnimationActive={false} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              }
              table={
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Fund</Th>
                      <Th align="right">{AXES[xKey].label}</Th>
                      <Th align="right">{AXES[yKey].label}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p) => (
                      <tr key={p.id}>
                        <Td>{p.name}</Td>
                        <Td align="right">{AXES[xKey].fmt(xKey === "risk" ? Math.round(p.x) : p.x)}</Td>
                        <Td align="right">{AXES[yKey].fmt(yKey === "risk" ? Math.round(p.y) : p.y)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              }
            />
          </>
        )}
      </Panel>

      <Panel title="Candidate table" description="Component scores are shown only where the proposal discloses them; ‘–’ means not reproduced in the proposal.">
        {tableView}
        <p className="mt-3 text-xs text-slate-500">
          The proposal publishes each fund&apos;s weighted overall score and role, but reproduces only two component scores —
          Legal Compliance (10 for all 22) and HDFC Mid Cap&apos;s Risk component (4). The other component scores sit in the
          Phase 3 fund files and can be added to <code className="text-[11px]">lib/data/funds.ts</code>. * Score note on the
          fund profile. ᵈ Debt-benchmark beta.
        </p>
      </Panel>
    </>
  )
}
