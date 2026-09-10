"use client"

import * as React from "react"

import { STATUS_COLORS } from "@/lib/colors"
import { cn } from "@/lib/utils"
import { Segmented, Swatch } from "@/components/dashboard/ui"

// ─── Recharts tooltip ─────────────────────────────────────────────────────

interface TipItem {
  name?: string | number
  value?: unknown
  color?: string
  dataKey?: unknown
  payload?: Record<string, unknown>
}

export function ChartTip({
  active,
  payload,
  label,
  valueFormatter = (v) => String(v),
  labelFormatter = (l) => String(l),
}: {
  active?: boolean
  payload?: ReadonlyArray<TipItem>
  label?: unknown
  valueFormatter?: (v: number, name: string) => string
  labelFormatter?: (l: unknown) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-slate-500">{labelFormatter(label)}</div>
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} aria-hidden />
            <span className="font-semibold text-slate-900 tabular-nums">
              {typeof p.value === "number" ? valueFormatter(p.value, String(p.name ?? "")) : String(p.value ?? "")}
            </span>
            <span className="text-slate-500">{String(p.name ?? "")}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Chart / table toggle ─────────────────────────────────────────────────

export function ChartFrame({
  chart,
  table,
  className,
}: {
  chart: React.ReactNode
  table: React.ReactNode
  className?: string
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart")
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-end">
        <Segmented
          size="xs"
          ariaLabel="View"
          value={view}
          onChange={setView}
          options={[
            { value: "chart", label: "Chart" },
            { value: "table", label: "Table" },
          ]}
        />
      </div>
      {view === "chart" ? chart : table}
    </div>
  )
}

// ─── Horizontal bars ──────────────────────────────────────────────────────

export interface HBarRow {
  key: string
  label: React.ReactNode
  value: number
  display: string
  color?: string
  sub?: React.ReactNode
  onClick?: () => void
}

export function HBars({
  rows,
  max,
  refLines = [],
  labelWidth = "w-40",
  className,
}: {
  rows: HBarRow[]
  max?: number
  refLines?: { value: number; label: string; tone?: "amber" | "red" }[]
  labelWidth?: string
  className?: string
}) {
  const scale = Math.max(max ?? 0, ...rows.map((r) => r.value), ...refLines.map((r) => r.value), 1e-9)
  return (
    <div className={cn("space-y-1.5", className)}>
      {rows.map((r) => {
        const Row = r.onClick ? "button" : "div"
        return (
          <Row
            key={r.key}
            type={r.onClick ? "button" : undefined}
            onClick={r.onClick}
            title={typeof r.label === "string" ? `${r.label}: ${r.display}` : r.display}
            className={cn(
              "group flex w-full items-center gap-3 rounded-md py-0.5 text-left",
              r.onClick && "cursor-pointer hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
            )}
          >
            <div className={cn("shrink-0 truncate text-xs text-slate-700", labelWidth)}>
              {r.label}
              {r.sub && <div className="truncate text-[11px] text-slate-400">{r.sub}</div>}
            </div>
            <div className="relative h-4 min-w-0 flex-1">
              <div
                className="absolute inset-y-[3px] left-0 rounded-r-[4px] transition-[width] duration-300 group-hover:brightness-110"
                style={{ width: `${Math.max(0, (r.value / scale) * 100)}%`, background: r.color ?? "#2a78d6" }}
              />
              {refLines.map((l) => (
                <div
                  key={l.label}
                  className="absolute inset-y-0 w-px"
                  style={{
                    left: `${(l.value / scale) * 100}%`,
                    background: l.tone === "red" ? STATUS_COLORS.critical : STATUS_COLORS.warning,
                  }}
                />
              ))}
            </div>
            <div className="w-16 shrink-0 text-right text-xs font-medium text-slate-900 tabular-nums">{r.display}</div>
          </Row>
        )
      })}
      {refLines.length > 0 && (
        <div className="flex flex-wrap justify-end gap-3 pt-1 text-[11px] text-slate-500">
          {refLines.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span
                className="h-3 w-px"
                style={{ background: l.tone === "red" ? STATUS_COLORS.critical : STATUS_COLORS.warning }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 100% stacked bar ─────────────────────────────────────────────────────

export interface Segment {
  key: string
  label: string
  value: number
  color: string
  display?: string
}

export function StackBar({
  segments,
  height = 22,
  legend = true,
  className,
}: {
  segments: Segment[]
  height?: number
  legend?: boolean
  className?: string
}) {
  const visible = segments.filter((s) => s.value > 1e-6)
  const total = visible.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-[4px]" style={{ height }}>
        {visible.map((s) => {
          const pct = (s.value / total) * 100
          return (
            <div
              key={s.key}
              title={`${s.label}: ${s.display ?? `${pct.toFixed(1)}%`}`}
              className="flex h-full min-w-[2px] items-center justify-center text-[11px] font-medium text-white transition-[width] duration-300"
              style={{ width: `${pct}%`, background: s.color }}
            >
              {pct >= 12 && <span className="truncate px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">{s.display ?? `${pct.toFixed(0)}%`}</span>}
            </div>
          )
        })}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {visible.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Swatch color={s.color} />
              {s.label}
              <span className="font-medium text-slate-900 tabular-nums">{s.display ?? `${((s.value / total) * 100).toFixed(1)}%`}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Circular 619 capacity gauge ──────────────────────────────────────────

export function CapacityGauge({
  util,
  working = 45,
  legal = 50,
  tone,
  label,
  size = 240,
  className,
}: {
  /** Fraction of total trust money in Circular 619-tier instruments. */
  util: number
  working?: number
  legal?: number
  tone: "green" | "amber" | "red"
  label?: string
  size?: number
  className?: string
}) {
  const w = 240
  const h = 162
  const cx = 120
  const cy = 136
  const r = 96
  const pct = Math.max(0, Math.min(100, util * 100))
  const point = (p: number, radius = r) => {
    const a = Math.PI * (1 - p / 100)
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)] as const
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from)
    const [x2, y2] = point(to)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }
  const color = tone === "green" ? STATUS_COLORS.good : tone === "amber" ? STATUS_COLORS.warning : STATUS_COLORS.critical
  const marker = (p: number, stroke: string, text: string, anchor: "end" | "start") => {
    const [x1, y1] = point(p, r - 16)
    const [x2, y2] = point(p, r + 10)
    const [tx, ty] = point(p, r + 18)
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2} />
        <text x={tx} y={ty - 2} textAnchor={anchor} className="fill-slate-600 text-[10px] font-medium">
          {text}
        </text>
      </g>
    )
  }
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: size }} role="img" aria-label={`Circular 619 utilisation ${pct.toFixed(1)}%`}>
        <path d={arc(0, 100)} fill="none" stroke="#e2e8f0" strokeWidth={14} strokeLinecap="butt" />
        {pct > 0.2 && <path d={arc(0, pct)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="butt" style={{ transition: "d 300ms" }} />}
        {marker(working, STATUS_COLORS.warning, `${working}% working`, "end")}
        {marker(legal, STATUS_COLORS.critical, `${legal}% legal`, "start")}
        <text x={cx} y={cy - 18} textAnchor="middle" className="fill-slate-900 text-[28px] font-semibold">
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-slate-500 text-[10px]">
          of total trust money
        </text>
        <text x={cx - r} y={cy + 14} textAnchor="middle" className="fill-slate-400 text-[9px]">0%</text>
        <text x={cx + r} y={cy + 14} textAnchor="middle" className="fill-slate-400 text-[9px]">100%</text>
      </svg>
      {label && <div className="-mt-1 text-center text-xs text-slate-600">{label}</div>}
    </div>
  )
}

// ─── Contribution waterfall ───────────────────────────────────────────────

export interface WaterfallRow {
  key: string
  label: string
  value: number
  note?: string
  muted?: boolean
  onClick?: () => void
}

export function Waterfall({
  rows,
  totalLabel,
  format,
  positiveColor = "#2a78d6",
  negativeColor = "#e34948",
}: {
  rows: WaterfallRow[]
  totalLabel: string
  format: (v: number) => string
  positiveColor?: string
  negativeColor?: string
}) {
  const steps = rows.reduce<(WaterfallRow & { start: number; end: number })[]>((acc, r) => {
    const start = acc.length ? acc[acc.length - 1].end : 0
    acc.push({ ...r, start, end: start + r.value })
    return acc
  }, [])
  const total = steps.length ? steps[steps.length - 1].end : 0
  const lo = Math.min(0, ...steps.map((s) => Math.min(s.start, s.end)))
  const hi = Math.max(0, ...steps.map((s) => Math.max(s.start, s.end)))
  const span = hi - lo || 1
  const x = (v: number) => ((v - lo) / span) * 100

  return (
    <div className="space-y-1">
      {steps.map((s) => {
        const left = x(Math.min(s.start, s.end))
        const width = Math.max(0.4, Math.abs(x(s.end) - x(s.start)))
        const Row = s.onClick ? "button" : "div"
        return (
          <Row
            key={s.key}
            type={s.onClick ? "button" : undefined}
            onClick={s.onClick}
            title={`${s.label}: ${format(s.value)}`}
            className={cn(
              "flex w-full items-center gap-3 rounded-md py-0.5 text-left",
              s.onClick && "hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
            )}
          >
            <div className="w-40 shrink-0 truncate text-xs text-slate-700">
              {s.label}
              {s.note && <span className="ml-1 text-[10px] text-slate-400">{s.note}</span>}
            </div>
            <div className="relative h-4 min-w-0 flex-1">
              <div className="absolute inset-y-0 w-px bg-slate-300" style={{ left: `${x(0)}%` }} />
              <div
                className={cn("absolute inset-y-[3px] rounded-[3px] transition-all duration-300", s.muted && "opacity-40")}
                style={{ left: `${left}%`, width: `${width}%`, background: s.value >= 0 ? positiveColor : negativeColor }}
              />
            </div>
            <div className="w-20 shrink-0 text-right text-xs font-medium text-slate-900 tabular-nums">{format(s.value)}</div>
          </Row>
        )
      })}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-1.5">
        <div className="w-40 shrink-0 text-xs font-semibold text-slate-900">{totalLabel}</div>
        <div className="relative h-4 min-w-0 flex-1">
          <div className="absolute inset-y-0 w-px bg-slate-300" style={{ left: `${x(0)}%` }} />
          <div
            className="absolute inset-y-[3px] rounded-[3px] bg-slate-800 transition-all duration-300"
            style={{ left: `${x(Math.min(0, total))}%`, width: `${Math.max(0.4, Math.abs(x(total) - x(0)))}%` }}
          />
        </div>
        <div className="w-20 shrink-0 text-right text-xs font-semibold text-slate-900 tabular-nums">{format(total)}</div>
      </div>
    </div>
  )
}

// ─── Progress meter ───────────────────────────────────────────────────────

export function Meter({ value, className, color = "#2a78d6" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-blue-100", className)}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  )
}
