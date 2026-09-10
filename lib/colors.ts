import type { Sleeve } from "@/lib/data/funds"

/**
 * Categorical palette (validated light-mode order — adjacent CVD ΔE ≥ 9.1).
 * Colour follows the entity: a sleeve keeps its hue on every chart.
 */
export const SLEEVE_COLORS: Record<Sleeve, string> = {
  core: "#2a78d6",
  passive: "#eb6834",
  satellite: "#1baf7a",
  sharia: "#eda100",
  "fixed-income": "#e87ba4",
  liquidity: "#008300",
  "base-tier": "#4a3aa7",
}

export const SLEEVE_LABELS: Record<Sleeve, string> = {
  core: "Core equity",
  passive: "Passive equity",
  satellite: "Satellite equity",
  sharia: "Sharia equity",
  "fixed-income": "Fixed income",
  liquidity: "Liquidity",
  "base-tier": "Base tier (direct)",
}

export const SLEEVE_ORDER: Sleeve[] = [
  "core",
  "passive",
  "satellite",
  "sharia",
  "fixed-income",
  "liquidity",
  "base-tier",
]

/** Portfolio identity — the first three slots validate all-pairs. */
export const PORTFOLIO_COLORS = {
  proposed: "#2a78d6",
  current: "#eb6834",
  fallback: "#1baf7a",
} as const

export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const

export const CHART = {
  grid: "#e5e7eb",
  axis: "#94a3b8",
  ink: "#0f172a",
  muted: "#64748b",
  neutral: "#cbd5e1",
} as const
