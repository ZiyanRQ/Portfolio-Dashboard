"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Info,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"

// ─── Provenance ───────────────────────────────────────────────────────────

export type ProvenanceKind = "measured" | "calculated" | "estimated" | "assumption" | "unconfirmed" | "na"

const PROVENANCE: Record<ProvenanceKind, { label: string; dot: string; cls: string; help: string }> = {
  measured: {
    label: "Measured",
    dot: "bg-teal-600",
    cls: "border-teal-200 bg-teal-50 text-teal-800",
    help: "Taken directly from the portfolio statement or fund disclosures.",
  },
  calculated: {
    label: "Calculated",
    dot: "bg-blue-600",
    cls: "border-blue-200 bg-blue-50 text-blue-800",
    help: "Derived arithmetically from measured inputs and the current weights.",
  },
  estimated: {
    label: "Estimated",
    dot: "bg-amber-500",
    cls: "border-amber-200 bg-amber-50 text-amber-900",
    help: "An approximation (e.g. holdings-based proxy or duration approximation).",
  },
  assumption: {
    label: "Assumption-based",
    dot: "bg-violet-600",
    cls: "border-violet-200 bg-violet-50 text-violet-800",
    help: "Depends on an illustrative input or a B-register assumption.",
  },
  unconfirmed: {
    label: "Unconfirmed",
    dot: "bg-red-600",
    cls: "border-red-200 bg-red-50 text-red-800",
    help: "Depends on a fact that has not yet been confirmed.",
  },
  na: {
    label: "Not available",
    dot: "bg-slate-400",
    cls: "border-slate-200 bg-slate-50 text-slate-600",
    help: "The source material does not support a figure.",
  },
}

export function Provenance({ kind, className, label }: { kind: ProvenanceKind; className?: string; label?: string }) {
  const p = PROVENANCE[kind]
  return (
    <span
      title={p.help}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium leading-4 whitespace-nowrap",
        p.cls,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", p.dot)} aria-hidden />
      {label ?? p.label}
    </span>
  )
}

export function ProvenanceLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {(Object.keys(PROVENANCE) as ProvenanceKind[]).map((k) => (
        <Provenance key={k} kind={k} />
      ))}
    </div>
  )
}

/** Inline "not available" marker for a missing figure. */
export function NA({ reason = "Not available" }: { reason?: string }) {
  return <span className="text-xs text-slate-400 italic">{reason}</span>
}

// ─── Status ───────────────────────────────────────────────────────────────

export type Tone = "green" | "amber" | "red" | "neutral" | "blue"

const TONE: Record<Tone, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  green: { cls: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  amber: { cls: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle },
  red: { cls: "border-red-200 bg-red-50 text-red-800", icon: XCircle },
  neutral: { cls: "border-slate-200 bg-slate-50 text-slate-700", icon: CircleDashed },
  blue: { cls: "border-blue-200 bg-blue-50 text-blue-800", icon: Info },
}

export function StatusPill({
  tone,
  children,
  icon = true,
  className,
}: {
  tone: Tone
  children: React.ReactNode
  icon?: boolean
  className?: string
}) {
  const t = TONE[tone]
  const Icon = t.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        t.cls,
        className
      )}
    >
      {icon && <Icon className="size-3.5 shrink-0" />}
      {children}
    </span>
  )
}

export function Callout({
  tone = "blue",
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  const t = TONE[tone]
  const Icon = t.icon
  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm", t.cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1 leading-relaxed">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-[13px] opacity-90">{children}</div>}
      </div>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-3xl space-y-1">
        {eyebrow && <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{eyebrow}</div>}
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Section" className="-mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-1 border-b border-slate-200 px-1">
        {tabs.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  footer,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
  bodyClassName?: string
  footer?: React.ReactNode
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {description && <p className="text-xs leading-relaxed text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
      {footer && <footer className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">{footer}</footer>}
    </section>
  )
}

export function Kpi({
  label,
  value,
  sub,
  provenance,
  tone,
  href,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  provenance?: ProvenanceKind
  tone?: Tone
  href?: string
  className?: string
}) {
  const accent =
    tone === "green"
      ? "before:bg-emerald-500"
      : tone === "amber"
        ? "before:bg-amber-400"
        : tone === "red"
          ? "before:bg-red-500"
          : tone === "blue"
            ? "before:bg-blue-500"
            : "before:bg-transparent"
  const body = (
    <div
      className={cn(
        "relative flex h-full flex-col gap-1 overflow-hidden rounded-lg border border-slate-200 bg-white px-3.5 py-3 before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
        accent,
        href && "transition-colors hover:border-slate-300 hover:bg-slate-50/60",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {provenance && <Provenance kind={provenance} />}
      </div>
      <div className="text-xl font-semibold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="text-xs leading-snug text-slate-500">{sub}</div>}
    </div>
  )
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

// ─── Inputs ───────────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
  className,
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: "xs" | "sm"
  ariaLabel?: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex shrink-0 rounded-md border border-slate-200 bg-slate-100 p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[5px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none",
              size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs sm:text-[13px]",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  hint,
  marks,
  className,
}: {
  label: React.ReactNode
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  hint?: React.ReactNode
  marks?: { value: number; label: string }[]
  className?: string
}) {
  const id = React.useId()
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          {label}
        </label>
        <span className="text-sm font-semibold text-slate-900 tabular-nums">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-slate-800"
      />
      {marks && (
        <div className="relative h-3 text-[10px] text-slate-400">
          {marks.map((m) => {
            const pct = ((m.value - min) / (max - min)) * 100
            // Keep end labels inside the track instead of centring them past its edges.
            const shift = pct < 4 ? "" : pct > 96 ? "-translate-x-full" : "-translate-x-1/2"
            return (
              <span key={m.value} className={cn("absolute whitespace-nowrap", shift)} style={{ left: `${pct}%` }}>
                {m.label}
              </span>
            )
          })}
        </div>
      )}
      {hint && <p className="text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  prefix,
  suffix,
  hint,
  placeholder,
  className,
}: {
  label: React.ReactNode
  value: number | null
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  prefix?: string
  suffix?: string
  hint?: React.ReactNode
  placeholder?: string
  className?: string
}) {
  const id = React.useId()
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        {prefix && <span className="pl-2.5 text-sm text-slate-400">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (e.target.value === "") onChange(0)
            else if (Number.isFinite(n)) onChange(n)
          }}
          className="h-full w-full min-w-0 bg-transparent px-2.5 text-sm text-slate-900 tabular-nums outline-none"
        />
        {suffix && <span className="pr-2.5 text-sm whitespace-nowrap text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  label?: React.ReactNode
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; group?: string }[]
  className?: string
  disabled?: boolean
}) {
  const id = React.useId()
  const groups = [...new Set(options.map((o) => o.group ?? ""))]
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      >
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ) : (
            options
              .filter((o) => !o.group)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
          )
        )}
      </select>
    </div>
  )
}

// ─── Small figures ────────────────────────────────────────────────────────

/** Signed delta, coloured by whether the direction is good. */
export function Delta({
  value,
  display,
  goodWhen,
  className,
}: {
  value: number
  display: string
  goodWhen: "up" | "down" | "none"
  className?: string
}) {
  const flat = Math.abs(value) < 1e-9
  const good = goodWhen === "none" || flat ? null : goodWhen === "up" ? value > 0 : value < 0
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        good === null ? "text-slate-600" : good ? "text-[#006300]" : "text-red-700",
        className
      )}
    >
      {!flat && <Icon className="size-3.5" />}
      {display}
    </span>
  )
}

export function Stat({
  label,
  value,
  provenance,
  hint,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  provenance?: ProvenanceKind
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="truncate">{label}</span>
        {provenance && <Provenance kind={provenance} />}
      </div>
      <div className="text-base font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-[11px] leading-snug text-slate-500">{hint}</div>}
    </div>
  )
}

export function Swatch({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)} style={{ background: color }} aria-hidden />
}

export function Formula({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">{children}</code>
  )
}

// ─── Tables ───────────────────────────────────────────────────────────────

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4", className)}>
      <table className="w-full min-w-max border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" | "center" }) {
  return (
    <th
      className={cn(
        "border-b border-slate-200 px-2 py-2 text-[11px] font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase first:pl-0 last:pr-0",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  align?: "left" | "right" | "center"
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border-b border-slate-100 px-2 py-2 align-middle text-slate-700 first:pl-0 last:pr-0",
        align === "right" ? "text-right tabular-nums" : align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {children}
    </td>
  )
}
