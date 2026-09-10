/**
 * The portfolio model. Pure functions only — every page derives its numbers
 * from these, so a change anywhere (weights, substitutions, B17, assumptions)
 * flows through the whole dashboard.
 */
import {
  getFund,
  isShariaScreened,
  type AssetClass,
  type Fund,
  type Sleeve,
} from "@/lib/data/funds"
import {
  CURRENT_HOLDINGS,
  PORTFOLIO_VALUE,
  type Slot,
} from "@/lib/data/portfolio"

export type PortfolioKey = "current" | "proposed" | "fallback"

export const PORTFOLIO_LABELS: Record<PortfolioKey, string> = {
  current: "Current",
  proposed: "Proposed",
  fallback: "Compliance fallback",
}

export type PlanType = "Regular" | "Direct" | "Direct instrument"

export interface Position {
  key: string
  fund: Fund
  /** Fraction of the portfolio, normalised so positions sum to 1. */
  weight: number
  value: number
  plan: PlanType
}

export interface Assumptions {
  /** Long-run return assumptions, % p.a. (§14.1). */
  equityReturn: number
  debtReturn: number
  liquidityReturn: number
  /** Not stated in the proposal — defaults to the debt-fund assumption. */
  baseTierReturn: number
  /** Blended Direct-plan cost, % p.a. (§14.1: ~0.3–0.6%). */
  directTer: number
  /** Regular-minus-Direct TER differential, % p.a. (§8: ~0.8–1.0%). */
  regularPremium: number
  /** Illustrative equity volatility, % p.a. — calibrated so 70% equity ≈ 9.5% (§14). */
  equityVol: number
  /** Expected-return shortfall of the Sharia sleeve, pp (§11). */
  shariaShortfall: number
  workingCeiling: number
  legalCeiling: number
  /** Amber band below the working ceiling, pp. */
  amberBand: number
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  equityReturn: 11,
  debtReturn: 7,
  liquidityReturn: 6.25,
  baseTierReturn: 7,
  directTer: 0.45,
  regularPremium: 0.9,
  equityVol: 13.5,
  shariaShortfall: 2,
  workingCeiling: 45,
  legalCeiling: 50,
  amberBand: 3,
}

// ─── Portfolio construction ───────────────────────────────────────────────

export function buildCurrent(): Position[] {
  return CURRENT_HOLDINGS.map((h) => ({
    key: h.fundId,
    fund: getFund(h.fundId),
    weight: h.value / PORTFOLIO_VALUE,
    value: h.value,
    plan: "Regular",
  }))
}

export function slotsTotal(slots: Slot[]) {
  return slots.reduce((s, x) => s + x.weight, 0)
}

export function buildFromSlots(slots: Slot[], total = PORTFOLIO_VALUE): Position[] {
  const sum = slotsTotal(slots)
  if (sum <= 0) return []
  return slots
    .filter((s) => s.weight > 0)
    .map((s) => {
      const fund = getFund(s.fundId)
      const weight = s.weight / sum
      return {
        key: s.slotId,
        fund,
        weight,
        value: weight * total,
        plan: fund.regTier === "base" ? "Direct instrument" : "Direct",
      }
    })
}

export interface Fallback {
  positions: Position[]
  /** Circular 619-tier share of this portfolio after the fallback is applied. */
  fundShare: number
  /** Amount moved into the base tier (INR). */
  migration: number
  /** Maximum Circular 619 share of this portfolio permitted at the working ceiling. */
  cap: number
}

/**
 * §13.4 fallback, generalised for any B17 value: keep fund weights relative to
 * each other, scale the Circular 619 sleeve down to the working ceiling of
 * total trust money and hold the remainder in a direct base-tier ladder.
 */
export function buildFallback(
  proposed: Position[],
  b17: number,
  a: Assumptions,
  total = PORTFOLIO_VALUE
): Fallback {
  const c619 = proposed.filter((p) => p.fund.regTier === "c619").reduce((s, p) => s + p.weight, 0)
  const cap = Math.min(1, ((a.workingCeiling / 100) * (total + b17)) / total)
  if (c619 <= cap + 1e-9) return { positions: proposed, fundShare: c619, migration: 0, cap }

  const scale = cap / c619
  const moved = c619 - cap
  const positions = proposed.map((p) =>
    p.fund.regTier === "c619" ? { ...p, weight: p.weight * scale, value: p.value * scale } : p
  )
  const existing = positions.findIndex((p) => p.fund.id === "base-ladder")
  if (existing >= 0) {
    const p = positions[existing]
    positions[existing] = { ...p, weight: p.weight + moved, value: p.value + moved * total }
  } else {
    positions.push({
      key: "fallback-base",
      fund: getFund("base-ladder"),
      weight: moved,
      value: moved * total,
      plan: "Direct instrument",
    })
  }
  return { positions, fundShare: cap, migration: moved * total, cap }
}

// ─── Metrics ──────────────────────────────────────────────────────────────

export interface Contribution {
  key: string
  fund: Fund
  weight: number
  value: number
  alpha: number
  /** Equity-market beta used (0 for debt / liquidity / base tier). */
  beta: number
  alphaContribution: number
  betaContribution: number
  /** Alpha/beta assigned by the proposal's own convention (Nifty tracker). */
  pdfAssumed: boolean
  /** Alpha/beta not disclosed — dashboard placeholder (beta 1.00 equity / alpha 0). */
  placeholder: boolean
}

export interface Metrics {
  positions: Position[]
  value: number
  byClass: Record<AssetClass, number>
  bySleeve: Record<Sleeve, number>
  equity: number
  fixedIncome: number
  liquidity: number
  baseTier: number
  c619: number
  base: number
  sharia: number
  shariaUnverified: number
  beta: number
  equitySleeveBeta: number | null
  alphaProxy: number
  contributions: Contribution[]
  placeholders: string[]
  grossReturn: number
  feePct: number
  shariaDrag: number
  expectedReturn: number
  volatility: number
  annualFees: number
  regularWeight: number
  sorted: Position[]
  largest: Position | null
  top3: number
  top5: number
  hhi: number
  effectiveN: number
  meaningful: number
  duration: {
    /** Σ w·D over positions with a disclosed duration (years, portfolio-weighted). */
    portfolio: number
    /** Weighted duration of the fixed-income sleeve (debt funds only). */
    fiSleeve: number | null
    /** Share of debt + liquidity weight with a disclosed duration. */
    coverage: number
    missing: string[]
  }
  foreign: { value: number; coverage: number }
  marketCap: { large: number; midSmall: number; undisclosed: number; coverage: number }
  amc: { amc: string; weight: number }[]
  credit: { aaaSovereign: number; belowAAA: number; undisclosed: number; sleeveWeight: number }
}

function sum<T>(items: T[], f: (x: T) => number) {
  return items.reduce((s, x) => s + f(x), 0)
}

export function positionTer(p: Position, a: Assumptions) {
  if (p.fund.regTier === "base" || p.plan === "Direct instrument") return 0
  return p.plan === "Regular" ? a.directTer + a.regularPremium : a.directTer
}

export function computeMetrics(positions: Position[], a: Assumptions): Metrics {
  const value = sum(positions, (p) => p.value)
  const byClass: Record<AssetClass, number> = { equity: 0, "fixed-income": 0, liquidity: 0, "base-tier": 0 }
  const bySleeve: Record<Sleeve, number> = {
    core: 0,
    passive: 0,
    satellite: 0,
    sharia: 0,
    "fixed-income": 0,
    liquidity: 0,
    "base-tier": 0,
  }
  for (const p of positions) {
    byClass[p.fund.assetClass] += p.weight
    bySleeve[p.fund.sleeve] += p.weight
  }
  const equity = byClass.equity
  const c619 = sum(positions.filter((p) => p.fund.regTier === "c619"), (p) => p.weight)
  const sharia = sum(positions.filter((p) => isShariaScreened(p.fund)), (p) => p.weight)
  const shariaUnverified = sum(
    positions.filter((p) => p.fund.shariaStatus === "unverified"),
    (p) => p.weight
  )

  const contributions: Contribution[] = positions.map((p) => {
    const isEquity = p.fund.assetClass === "equity"
    const isDirect = p.fund.researchStatus === "instrument"
    const missingBeta = isEquity && p.fund.beta === null
    const missingAlpha = !isDirect && p.fund.alpha === null
    const beta = isEquity ? p.fund.beta ?? 1 : 0
    const alpha = p.fund.alpha ?? 0
    return {
      key: p.key,
      fund: p.fund,
      weight: p.weight,
      value: p.value,
      alpha,
      beta,
      alphaContribution: p.weight * alpha,
      betaContribution: p.weight * beta,
      pdfAssumed: Boolean(p.fund.alphaBetaAssumed),
      placeholder: missingBeta || missingAlpha,
    }
  })
  const beta = sum(contributions, (c) => c.betaContribution)
  const alphaProxy = sum(contributions, (c) => c.alphaContribution)

  const fixedIncome = byClass["fixed-income"]
  const liquidity = byClass.liquidity
  const baseTier = byClass["base-tier"]
  const grossReturn =
    equity * a.equityReturn +
    fixedIncome * a.debtReturn +
    liquidity * a.liquidityReturn +
    baseTier * a.baseTierReturn
  const feePct = sum(positions, (p) => p.weight * positionTer(p, a))
  const shariaDrag = sharia * a.shariaShortfall
  const expectedReturn = grossReturn - feePct - shariaDrag

  const sorted = [...positions].sort((x, y) => y.weight - x.weight)
  const hhiRaw = sum(positions, (p) => p.weight * p.weight)

  const incomePositions = positions.filter(
    (p) => p.fund.assetClass === "fixed-income" || p.fund.assetClass === "liquidity"
  )
  const withDuration = incomePositions.filter((p) => p.fund.duration !== null)
  const fiFunds = positions.filter((p) => p.fund.assetClass === "fixed-income" && p.fund.duration !== null)
  const fiWeight = sum(fiFunds, (p) => p.weight)
  const incomeWeight = sum(incomePositions, (p) => p.weight)

  const equityPositions = positions.filter((p) => p.fund.assetClass === "equity")
  const foreignKnown = equityPositions.filter((p) => p.fund.foreignPct !== null)
  const capKnown = equityPositions.filter((p) => p.fund.midSmallPct !== null)
  const midSmall = sum(capKnown, (p) => (p.weight * (p.fund.midSmallPct ?? 0)) / 100)
  const capKnownWeight = sum(capKnown, (p) => p.weight)

  const amcMap = new Map<string, number>()
  for (const p of positions) {
    if (p.fund.regTier === "base") continue
    const name = p.fund.id === "nifty50" ? "Nifty tracker (AMC not selected)" : p.fund.amc
    amcMap.set(name, (amcMap.get(name) ?? 0) + p.weight)
  }

  const creditPositions = incomePositions.filter((p) => p.fund.id !== "cash-pending")
  const creditWeight = sum(creditPositions, (p) => p.weight)
  const aaaSovereign = sum(creditPositions, (p) => (p.weight * (p.fund.credit?.aaaSovereign ?? 0)) / 100)
  const belowAAA = sum(creditPositions, (p) => (p.weight * (p.fund.credit?.belowAAA ?? 0)) / 100)

  return {
    positions,
    value,
    byClass,
    bySleeve,
    equity,
    fixedIncome,
    liquidity,
    baseTier,
    c619,
    base: 1 - c619,
    sharia,
    shariaUnverified,
    beta,
    equitySleeveBeta: equity > 0 ? beta / equity : null,
    alphaProxy,
    contributions,
    placeholders: contributions.filter((c) => c.placeholder).map((c) => c.fund.shortName),
    grossReturn,
    feePct,
    shariaDrag,
    expectedReturn,
    volatility: equity * a.equityVol,
    annualFees: sum(positions, (p) => (p.value * positionTer(p, a)) / 100),
    regularWeight: sum(positions.filter((p) => p.plan === "Regular"), (p) => p.weight),
    sorted,
    largest: sorted[0] ?? null,
    top3: sum(sorted.slice(0, 3), (p) => p.weight),
    top5: sum(sorted.slice(0, 5), (p) => p.weight),
    hhi: hhiRaw * 10_000,
    effectiveN: hhiRaw > 0 ? 1 / hhiRaw : 0,
    meaningful: positions.filter((p) => p.weight >= 0.02).length,
    duration: {
      portfolio: sum(withDuration, (p) => p.weight * (p.fund.duration ?? 0)),
      fiSleeve: fiWeight > 0 ? sum(fiFunds, (p) => p.weight * (p.fund.duration ?? 0)) / fiWeight : null,
      coverage: incomeWeight > 0 ? sum(withDuration, (p) => p.weight) / incomeWeight : 1,
      missing: incomePositions.filter((p) => p.fund.duration === null).map((p) => p.fund.shortName),
    },
    foreign: {
      value: sum(foreignKnown, (p) => (p.weight * (p.fund.foreignPct ?? 0)) / 100),
      coverage: equity > 0 ? sum(foreignKnown, (p) => p.weight) / equity : 1,
    },
    marketCap: {
      midSmall,
      large: capKnownWeight - midSmall,
      undisclosed: equity - capKnownWeight,
      coverage: equity > 0 ? capKnownWeight / equity : 1,
    },
    amc: [...amcMap.entries()].map(([amc, weight]) => ({ amc, weight })).sort((x, y) => y.weight - x.weight),
    credit: {
      aaaSovereign,
      belowAAA,
      undisclosed: Math.max(0, creditWeight - aaaSovereign - belowAAA),
      sleeveWeight: creditWeight,
    },
  }
}

// ─── Stress ───────────────────────────────────────────────────────────────

export type StressMethod = "beta" | "one-to-one"

export const STRESS_METHOD_LABELS: Record<StressMethod, string> = {
  beta: "Beta-based model",
  "one-to-one": "Conservative 1:1 equity stress",
}

/** Portfolio return (percent) for an equity-market move of `shock` percent. */
export function equityShock(m: Metrics, shock: number, method: StressMethod) {
  return (method === "beta" ? m.beta : m.equity) * shock
}

/** Price impact (percent of position) for a parallel yield move of `dy` percentage points. */
export function durationImpact(duration: number | null, dy: number) {
  return duration === null ? null : -duration * dy
}

/** Portfolio-level rate impact (percent of portfolio). */
export function rateShock(m: Metrics, dy: number) {
  return -m.duration.portfolio * dy
}

export function largestHoldingShock(m: Metrics, shock = -30) {
  return (m.largest?.weight ?? 0) * shock
}

// ─── Circular 619 compliance ──────────────────────────────────────────────

export type ComplianceTone = "green" | "amber" | "red"

export interface Compliance {
  total: number
  c619Amount: number
  util: number
  legalCap: number
  workingCap: number
  headroomWorking: number
  headroomLegal: number
  migration: number
  excessLegal: number
  breakeven: number
  tone: ComplianceTone
  label: string
}

export function compliance(c619Amount: number, portfolioValue: number, b17: number, a: Assumptions): Compliance {
  const total = portfolioValue + b17
  const util = total > 0 ? c619Amount / total : 0
  const legalCap = (total * a.legalCeiling) / 100
  const workingCap = (total * a.workingCeiling) / 100
  const utilPct = util * 100
  let tone: ComplianceTone = "green"
  let label = "Within the 45% working ceiling"
  if (utilPct > a.legalCeiling + 1e-9) {
    tone = "red"
    label = "Exceeds the 50% statutory ceiling"
  } else if (utilPct > a.workingCeiling + 1e-9) {
    tone = "amber"
    label = "Above the 45% working ceiling — rebalance (within the 50% legal limit)"
  } else if (utilPct > a.workingCeiling - a.amberBand) {
    tone = "amber"
    label = "Close to the 45% working ceiling"
  }
  return {
    total,
    c619Amount,
    util,
    legalCap,
    workingCap,
    headroomWorking: workingCap - c619Amount,
    headroomLegal: legalCap - c619Amount,
    migration: Math.max(0, c619Amount - workingCap),
    excessLegal: Math.max(0, c619Amount - legalCap),
    breakeven: Math.max(0, c619Amount / (a.workingCeiling / 100) - portfolioValue),
    tone,
    label,
  }
}

// ─── Sharia allocation ────────────────────────────────────────────────────

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Set the Sharia-screened share of the proposal to `target` percent, taking the
 * difference pro-rata from (or giving it back to) conventional equity so total
 * equity is unchanged.
 */
export function applySharia(slots: Slot[], target: number): Slot[] {
  const fundOf = (s: Slot) => getFund(s.fundId)
  const isEquity = (s: Slot) => fundOf(s).assetClass === "equity"
  const sharia = slots.filter((s) => isEquity(s) && isShariaScreened(fundOf(s)))
  const conventional = slots.filter((s) => isEquity(s) && !isShariaScreened(fundOf(s)))
  const shariaTotal = slotsTotal(sharia)
  const convTotal = slotsTotal(conventional)
  const equityTotal = shariaTotal + convTotal
  const t = Math.max(0, Math.min(target, equityTotal))
  const convScale = convTotal > 0 ? (equityTotal - t) / convTotal : 0

  const next = slots.map((s) => {
    if (conventional.includes(s)) return { ...s, weight: round2(s.weight * convScale) }
    if (sharia.includes(s)) {
      if (shariaTotal > 0) return { ...s, weight: round2((s.weight / shariaTotal) * t) }
      return { ...s, weight: s === sharia[0] ? round2(t) : 0 }
    }
    return s
  })
  if (sharia.length === 0 && t > 0) {
    next.push({ slotId: `sharia-${Date.now()}`, fundId: "tata-ethical", weight: round2(t) })
  }
  return next
}

// ─── Implementation / transition ──────────────────────────────────────────

export type ActionKind = "exit" | "trim" | "switch" | "add" | "increase"

export interface TradeAction {
  id: string
  kind: ActionKind
  funds: Fund[]
  title: string
  side: "Sell" | "Buy" | "Switch"
  currentAmount: number
  targetAmount: number
  tradeAmount: number
  /** Pro-rata share of reported unrealised gain realised by this action. */
  realisedGain: number | null
  dependency: string
  approval: string
  taxNote: string
  optional: boolean
}

const SLEEVE_RANK: Record<Sleeve, number> = {
  core: 0,
  passive: 1,
  satellite: 2,
  "fixed-income": 3,
  liquidity: 4,
  sharia: 5,
  "base-tier": 6,
}

const SELL_DEPENDENCY = "B17 confirmed (O2) or fallback adopted · trustee resolution (§18)"
const RESOLUTION = "Trustee resolution (§18)"

export function buildActions(target: Position[]): TradeAction[] {
  const targetByFund = new Map<string, number>()
  for (const p of target) targetByFund.set(p.fund.id, (targetByFund.get(p.fund.id) ?? 0) + p.value)

  const sells: TradeAction[] = []
  const switched: { fund: Fund; amount: number; gain: number | null }[] = []
  const buys: TradeAction[] = []

  for (const h of CURRENT_HOLDINGS) {
    const fund = getFund(h.fundId)
    const tgt = targetByFund.get(h.fundId) ?? 0
    const gainShare = (amount: number) =>
      h.unrealisedGain === null ? null : h.unrealisedGain * (amount / h.value)
    if (tgt <= 0.5) {
      sells.push({
        id: `exit:${fund.id}`,
        kind: "exit",
        funds: [fund],
        title: `Exit ${fund.shortName}`,
        side: "Sell",
        currentAmount: h.value,
        targetAmount: 0,
        tradeAmount: h.value,
        realisedGain: gainShare(h.value),
        dependency: SELL_DEPENDENCY,
        approval: RESOLUTION,
        taxNote:
          h.unrealisedGain === null
            ? "Unrealised gain not reported in the statement; expected to be small."
            : "Full exit crystallises the reported gain.",
        optional: false,
      })
      continue
    }
    if (tgt < h.value - 0.5) {
      const sold = h.value - tgt
      sells.push({
        id: `trim:${fund.id}`,
        kind: "trim",
        funds: [fund],
        title: `Trim ${fund.shortName}`,
        side: "Sell",
        currentAmount: h.value,
        targetAmount: tgt,
        tradeAmount: sold,
        realisedGain: gainShare(sold),
        dependency: SELL_DEPENDENCY,
        approval: RESOLUTION,
        taxNote:
          (h.unrealisedGainPct ?? 0) > 20
            ? "Large embedded gain — stage across tranches and reinvest under s.11(1A)."
            : "Trivial gain — can move in one step.",
        optional: false,
      })
    }
    switched.push({ fund, amount: Math.min(tgt, h.value), gain: gainShare(Math.min(tgt, h.value)) })
    if (tgt > h.value + 0.5) {
      buys.push({
        id: `increase:${fund.id}`,
        kind: "increase",
        funds: [fund],
        title: `Increase ${fund.shortName}`,
        side: "Buy",
        currentAmount: h.value,
        targetAmount: tgt,
        tradeAmount: tgt - h.value,
        realisedGain: null,
        dependency: "Sale proceeds available",
        approval: RESOLUTION,
        taxNote: "Reinvestment of sale proceeds — supports s.11(1A) deemed application.",
        optional: false,
      })
    }
  }

  const switchAction: TradeAction[] = switched.length
    ? [
        {
          id: "switch:regular-direct",
          kind: "switch",
          funds: switched.map((s) => s.fund),
          title: "Switch retained Regular plans to Direct",
          side: "Switch",
          currentAmount: sum(switched, (s) => s.amount),
          targetAmount: sum(switched, (s) => s.amount),
          tradeAmount: sum(switched, (s) => s.amount),
          realisedGain: switched.every((s) => s.gain === null) ? null : sum(switched, (s) => s.gain ?? 0),
          dependency: "Fold into the same reinvestment tranche as the trims (§18)",
          approval: RESOLUTION,
          taxNote: "A Regular → Direct switch is a redemption for tax (§18).",
          optional: false,
        },
      ]
    : []

  const heldIds = new Set(CURRENT_HOLDINGS.map((h) => h.fundId))
  const additions = [...targetByFund.entries()]
    .filter(([id, v]) => !heldIds.has(id) && v > 0.5)
    .map(([id, v]) => ({ fund: getFund(id), value: v }))
    .sort((x, y) => SLEEVE_RANK[x.fund.sleeve] - SLEEVE_RANK[y.fund.sleeve] || y.value - x.value)

  for (const { fund, value } of additions) {
    const sleeve = fund.sleeve
    const title =
      sleeve === "fixed-income"
        ? `Add fixed-income sleeve — ${fund.shortName}`
        : sleeve === "liquidity"
          ? `Add liquidity reserve — ${fund.shortName}`
          : sleeve === "sharia"
            ? `Add optional Sharia allocation — ${fund.shortName}`
            : sleeve === "base-tier"
              ? `Build base-tier ladder — ${fund.shortName}`
              : `Add ${fund.shortName}`
    const dependency =
      sleeve === "sharia"
        ? "Sale proceeds · trustee Sharia decision (B9, O9)"
        : sleeve === "base-tier"
          ? "B17 not confirmed · trust demat / CSGL account for G-Secs (§18)"
          : fund.id === "nifty50"
            ? "Sale proceeds · select the lowest-TER tracker"
            : "Sale proceeds available"
    buys.push({
      id: `add:${fund.id}`,
      kind: "add",
      funds: [fund],
      title,
      side: "Buy",
      currentAmount: 0,
      targetAmount: value,
      tradeAmount: value,
      realisedGain: null,
      dependency,
      approval:
        sleeve === "sharia"
          ? "Trustee resolution incl. Sharia decision"
          : sleeve === "base-tier"
            ? "Trustee resolution adopting the base-tier fallback"
            : RESOLUTION,
      taxNote:
        sleeve === "base-tier"
          ? "Deposits may not count as capital-asset reinvestment under s.11(1A) — confirm with a CA (§19)."
          : "Reinvestment of sale proceeds in MF units — supports s.11(1A) deemed application.",
      optional: sleeve === "sharia",
    })
  }

  return [...sells, ...switchAction, ...buys]
}

export interface Transition {
  positions: Position[]
  cash: number
  fundingGap: number
  valueProgress: number
  countProgress: number
  completed: number
}

export function buildTransition(actions: TradeAction[], done: (id: string) => boolean): Transition {
  const values = new Map<string, number>(CURRENT_HOLDINGS.map((h) => [h.fundId, h.value]))
  const plans = new Map<string, PlanType>(CURRENT_HOLDINGS.map((h) => [h.fundId, "Regular"]))
  let cash = 0
  let doneValue = 0
  let totalValue = 0
  let completed = 0

  for (const a of actions) {
    const moves = a.kind !== "switch"
    if (moves) totalValue += a.tradeAmount
    if (!done(a.id)) continue
    completed += 1
    if (moves) doneValue += a.tradeAmount
    const f = a.funds[0]
    if (a.kind === "exit" || a.kind === "trim") {
      values.set(f.id, (values.get(f.id) ?? 0) - a.tradeAmount)
      cash += a.tradeAmount
    } else if (a.kind === "add" || a.kind === "increase") {
      values.set(f.id, (values.get(f.id) ?? 0) + a.tradeAmount)
      if (!plans.has(f.id)) plans.set(f.id, f.regTier === "base" ? "Direct instrument" : "Direct")
      cash -= a.tradeAmount
    } else {
      for (const fund of a.funds) plans.set(fund.id, "Direct")
    }
  }

  const entries = [...values.entries()].filter(([, v]) => v > 0.5)
  if (cash > 0.5) entries.push(["cash-pending", cash])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const positions: Position[] = entries.map(([id, v]) => ({
    key: id,
    fund: getFund(id),
    weight: total > 0 ? v / total : 0,
    value: v,
    plan: id === "cash-pending" ? "Direct instrument" : plans.get(id) ?? "Direct",
  }))

  return {
    positions,
    cash: Math.max(0, cash),
    fundingGap: Math.max(0, -cash),
    valueProgress: totalValue > 0 ? doneValue / totalValue : 0,
    countProgress: actions.length > 0 ? completed / actions.length : 0,
    completed,
  }
}

// ─── Scenarios ────────────────────────────────────────────────────────────

export interface ScenarioInputs {
  equityWeight: number // %
  liquidityWeight: number // %
  equityReturn: number
  debtReturn: number
  liquidityReturn: number
  inflation: number
  /** One-off parallel yield change in year 1, percentage points. */
  rateChange: number
  /** When set, replaces the equity return in year 1 (a drawdown year). */
  year1Override: boolean
  year1EquityReturn: number
  horizon: 1 | 5 | 10 | 20
}

export type PresetKey = "bull" | "base" | "bear"

/**
 * Presets calibrated to reproduce the §17 illustrative outcome ranges
 * (bull ~11–13%, base ~9%, bear down ~14–22% in the year). Assumptions, not forecasts.
 */
export const SCENARIO_PRESETS: Record<PresetKey, Omit<ScenarioInputs, "equityWeight" | "liquidityWeight" | "horizon">> = {
  bull: { equityReturn: 14, debtReturn: 7.5, liquidityReturn: 6.5, inflation: 4, rateChange: -0.5, year1Override: false, year1EquityReturn: 14 },
  base: { equityReturn: 11, debtReturn: 7, liquidityReturn: 6.25, inflation: 4, rateChange: 0, year1Override: false, year1EquityReturn: 11 },
  bear: { equityReturn: 11, debtReturn: 6.5, liquidityReturn: 6, inflation: 4, rateChange: 0.5, year1Override: true, year1EquityReturn: -25 },
}

export interface ScenarioResult {
  series: { year: number; nominal: number; real: number }[]
  steadyReturn: number
  realReturn: number
  year1Return: number
  cagr: number
  finalNominal: number
  finalReal: number
  incomeYear1: number
  volatility: number
  stressLoss20: number
}

export function projectScenario(
  s: ScenarioInputs,
  opts: { start: number; ter: number; fiDuration: number; equityVol: number }
): ScenarioResult {
  const eq = s.equityWeight / 100
  const liq = s.liquidityWeight / 100
  const fi = Math.max(0, 1 - eq - liq)
  const debt = s.debtReturn + s.rateChange
  const cashR = s.liquidityReturn + s.rateChange
  const steady = eq * s.equityReturn + fi * debt + liq * cashR - opts.ter
  const reval = -fi * opts.fiDuration * s.rateChange
  const year1Equity = s.year1Override ? s.year1EquityReturn : s.equityReturn
  const year1 = eq * year1Equity + fi * debt + liq * cashR - opts.ter + reval

  const series = [{ year: 0, nominal: opts.start, real: opts.start }]
  let nominal = opts.start
  for (let y = 1; y <= s.horizon; y++) {
    nominal *= 1 + (y === 1 ? year1 : steady) / 100
    const real = nominal / Math.pow(1 + s.inflation / 100, y)
    series.push({ year: y, nominal, real })
  }
  const final = series[series.length - 1]
  return {
    series,
    steadyReturn: steady,
    realReturn: ((1 + steady / 100) / (1 + s.inflation / 100) - 1) * 100,
    year1Return: year1,
    cagr: (Math.pow(final.nominal / opts.start, 1 / s.horizon) - 1) * 100,
    finalNominal: final.nominal,
    finalReal: final.real,
    incomeYear1: (opts.start * (fi * debt + liq * cashR)) / 100,
    volatility: eq * opts.equityVol,
    stressLoss20: eq * -20,
  }
}
