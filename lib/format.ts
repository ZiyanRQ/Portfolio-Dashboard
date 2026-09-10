export type Currency = "INR" | "GBP" | "USD"

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "INR", symbol: "₹", label: "INR ₹" },
  { code: "GBP", symbol: "£", label: "GBP £" },
  { code: "USD", symbol: "$", label: "USD $" },
]

/** INR per one unit of the foreign currency. */
export interface FxRates {
  GBP: number
  USD: number
}

export interface MoneyOptions {
  /** Compact notation: crore / lakh for INR, k / m for GBP and USD. Default true. */
  compact?: boolean
  /** Always show a sign (+ / −). */
  sign?: boolean
  digits?: number
}

const MINUS = "−"

export function convert(inr: number, currency: Currency, rates: FxRates) {
  return currency === "INR" ? inr : inr / rates[currency]
}

export function formatMoney(
  inr: number,
  currency: Currency,
  rates: FxRates,
  { compact = true, sign = false, digits }: MoneyOptions = {}
): string {
  if (!Number.isFinite(inr)) return "—"
  const value = convert(inr, currency, rates)
  const abs = Math.abs(value)
  const symbol = currency === "INR" ? "₹" : currency === "GBP" ? "£" : "$"
  const prefix = value < 0 ? MINUS : sign && value > 0 ? "+" : ""
  let body: string

  if (!compact) {
    body = abs.toLocaleString(currency === "INR" ? "en-IN" : currency === "GBP" ? "en-GB" : "en-US", {
      maximumFractionDigits: 0,
    })
  } else if (currency === "INR") {
    if (abs >= 1e7) body = `${(abs / 1e7).toFixed(digits ?? 2)} cr`
    else if (abs >= 1e5) body = `${(abs / 1e5).toFixed(digits ?? 2)} L`
    else body = abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })
  } else {
    if (abs >= 1e6) body = `${(abs / 1e6).toFixed(digits ?? 2)}m`
    else if (abs >= 1e3) body = `${(abs / 1e3).toFixed(digits ?? 1)}k`
    else body = abs.toFixed(0)
  }
  return `${prefix}${symbol}${body}`
}

/** Fraction → "17.0%". */
export function fmtPct(fraction: number, digits = 1, sign = false) {
  if (!Number.isFinite(fraction)) return "—"
  const v = fraction * 100
  const s = Math.abs(v).toFixed(digits)
  const prefix = v < 0 && Number(s) !== 0 ? MINUS : sign && v > 0 && Number(s) !== 0 ? "+" : ""
  return `${prefix}${s}%`
}

/** Percent number → "9.2%". */
export function fmtRate(percent: number, digits = 1, sign = false) {
  return fmtPct(percent / 100, digits, sign)
}

/** Percentage points → "+1.89pp". */
export function fmtPP(pp: number, digits = 2, sign = true) {
  if (!Number.isFinite(pp)) return "—"
  const s = Math.abs(pp).toFixed(digits)
  const prefix = pp < 0 && Number(s) !== 0 ? MINUS : sign && pp > 0 && Number(s) !== 0 ? "+" : ""
  return `${prefix}${s}pp`
}

export function fmtNum(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—"
  const s = Math.abs(n).toFixed(digits)
  return n < 0 && Number(s) !== 0 ? `${MINUS}${s}` : s
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}
