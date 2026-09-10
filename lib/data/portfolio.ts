/**
 * Portfolio facts from the proposal. Monetary values are INR (rupees).
 */

/** Non-identifying facts only — names and references come from lib/identity (env, signed-in users). */
export const SOCIETY = {
  documentDate: "September 2026",
  statementDate: "8 February 2026",
} as const

export interface CurrentHolding {
  fundId: string
  value: number
  unrealisedGain: number | null
  unrealisedGainPct: number | null
  irr: number
  irrVsBenchmark: number | null
  plan: "Regular"
}

/** Section 6 — all holdings Regular-Growth. */
export const CURRENT_HOLDINGS: CurrentHolding[] = [
  {
    fundId: "sbi-lmc",
    value: 26_988_966,
    unrealisedGain: 11_439_315,
    unrealisedGainPct: 73.57,
    irr: 17.76,
    irrVsBenchmark: -0.49,
    plan: "Regular",
  },
  {
    fundId: "absl-flexi",
    value: 25_676_210,
    unrealisedGain: 676_214,
    unrealisedGainPct: 2.7,
    irr: 7.71,
    irrVsBenchmark: 5.15,
    plan: "Regular",
  },
  {
    fundId: "absl-liquid",
    value: 211_061,
    unrealisedGain: null,
    unrealisedGainPct: null,
    irr: 5.76,
    irrVsBenchmark: null,
    plan: "Regular",
  },
]

export const PORTFOLIO_VALUE = 52_876_237
/** As reported. Per-fund gains sum to ₹1,21,15,529 — a ₹1 rounding difference in the statement. */
export const REPORTED_UNREALISED_GAIN = 12_115_528
export const REPORTED_UNREALISED_GAIN_PCT = 29.88

export interface Slot {
  slotId: string
  fundId: string
  /** Target weight in percent (0–100). */
  weight: number
}

/** Section 12 — Core Growth 70/30. */
export const RECOMMENDED_SLOTS: Slot[] = [
  { slotId: "s1", fundId: "ppfas-flexi", weight: 17 },
  { slotId: "s2", fundId: "nifty50", weight: 14 },
  { slotId: "s3", fundId: "icici-value", weight: 13 },
  { slotId: "s4", fundId: "absl-flexi", weight: 11 },
  { slotId: "s5", fundId: "sbi-lmc", weight: 10 },
  { slotId: "s6", fundId: "tata-ethical", weight: 5 },
  { slotId: "s7", fundId: "icici-cb", weight: 14 },
  { slotId: "s8", fundId: "hdfc-sd", weight: 10 },
  { slotId: "s9", fundId: "icici-liquid", weight: 6 },
]

/** Figures printed in the proposal, used for reconciliation notes. */
export const PDF_FIGURES = {
  currentBeta: 0.91,
  currentAlpha: 3.24,
  proposedBeta: 0.583,
  proposedSleeveBeta: 0.83,
  proposedAlpha: 1.889,
  b17Breakeven: 6.46e7,
  fallbackMigration: 2.91e7,
  feeSavingLow: 6e5,
  feeSavingHigh: 7e5,
  terDiffLow: 0.8,
  terDiffHigh: 1.0,
  shariaCostPerYear: 1.5e5,
  fullShariaCostPerYear: 2.5e6,
  shariaShortfallPP: 2,
  top5Proposed: 65,
  expectedReturnProposed: "~9% p.a.",
  volatilityProposed: "~9–10% p.a.",
} as const

export const LIMITS = {
  maxPosition: 20, // % per fund, hard (§21)
  amcGuideline: 32, // % per AMC without recorded rationale (§21)
  top5Trigger: 70, // % (§20)
  fundBand: 3, // ± pp per fund (§21)
  sleeveBand: 5, // ± pp per sleeve (§21)
  ppfasIndianListedFloor: 65,
  ppfasIndianListedReview: 68,
  ppfasIndianListedApprox: 70.7, // clears 65% by ~5.7 points (§9)
} as const
