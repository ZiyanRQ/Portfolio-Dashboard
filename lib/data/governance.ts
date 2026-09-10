/**
 * Monitoring calendar (§20), rebalancing policy (§21), trustee decisions (§18, §23)
 * and the reconciliation flags this dashboard raises against the source figures.
 */

export type TaskStatus =
  | "Complete"
  | "Due"
  | "Overdue"
  | "Requires Trustee Decision"
  | "Requires External Confirmation"

export const TASK_STATUSES: TaskStatus[] = [
  "Complete",
  "Due",
  "Overdue",
  "Requires Trustee Decision",
  "Requires External Confirmation",
]

export type Frequency = "Monthly" | "Quarterly" | "Annual"

export interface MonitoringTask {
  id: string
  frequency: Frequency
  title: string
  check: string
  trigger: string
  evidence: string
  defaultStatus: TaskStatus
  defaultNextDue: string
}

// Next-due defaults: month-end, quarter-end (Q2 FY 2026-27) and financial-year end.
const MONTH_END = "2026-09-30"
const QUARTER_END = "2026-09-30"
const YEAR_END = "2027-03-31"

export const MONITORING_TASKS: MonitoringTask[] = [
  {
    id: "m-c619",
    frequency: "Monthly",
    title: "Circular 619 utilisation",
    check: "Circular 619-tier holdings at market value vs total trust money (continuous test, B3)",
    trigger: "> 45% working ceiling → rebalance; > 50% legal ceiling → remediate without delay",
    evidence: "§3.1, §20, §21",
    defaultStatus: "Requires External Confirmation",
    defaultNextDue: MONTH_END,
  },
  {
    id: "m-ppfas",
    frequency: "Monthly",
    title: "Parag Parikh 65% Indian-listed test (L1)",
    check: "Indian-listed share of Parag Parikh Flexi Cap (and any foreign-clause fund)",
    trigger: "< 68% Indian-listed → review; < 65% fails clause (h)",
    evidence: "§9, §20, O4",
    defaultStatus: "Due",
    defaultNextDue: MONTH_END,
  },
  {
    id: "m-drift",
    frequency: "Monthly",
    title: "Allocation drift",
    check: "Portfolio weights vs target",
    trigger: "± 3 pp per fund; ± 5 pp per sleeve; any fund > 20%",
    evidence: "§20, §21",
    defaultStatus: "Due",
    defaultNextDue: MONTH_END,
  },
  {
    id: "m-liquidity",
    frequency: "Monthly",
    title: "Liquidity level",
    check: "Liquid sleeve vs payroll / fee-cycle reserve",
    trigger: "Reserve below the months of expenditure trustees set (B14)",
    evidence: "§8, §15, B14",
    defaultStatus: "Due",
    defaultNextDue: MONTH_END,
  },
  {
    id: "q-rebalance",
    frequency: "Quarterly",
    title: "Rebalancing",
    check: "Sleeves and funds vs tolerance bands",
    trigger: "Any fund > 20%; sleeve outside ± 5 pp; C619 > 45%; a Gate-1 monitoring failure",
    evidence: "§21",
    defaultStatus: "Due",
    defaultNextDue: QUARTER_END,
  },
  {
    id: "q-credit",
    frequency: "Quarterly",
    title: "Credit review",
    check: "Credit quality of the income sleeve, esp. HDFC Short Duration below-AAA",
    trigger: "Below-AAA sleeve downgrade → review",
    evidence: "§15, §20",
    defaultStatus: "Due",
    defaultNextDue: QUARTER_END,
  },
  {
    id: "q-ter",
    frequency: "Quarterly",
    title: "TER review",
    check: "All holdings in Direct plans; expense-ratio changes",
    trigger: "Any Regular-plan holding; material TER increase",
    evidence: "§8, §23 (plan-type policy)",
    defaultStatus: "Due",
    defaultNextDue: QUARTER_END,
  },
  {
    id: "q-attribution",
    frequency: "Quarterly",
    title: "Performance attribution",
    check: "Holdings-based alpha/beta proxy; regression statistics once a return series exists",
    trigger: "Alpha/beta/Sharpe/Sortino/drawdown enter the pack only when computable (O10)",
    evidence: "§14.2, §20, O10",
    defaultStatus: "Due",
    defaultNextDue: QUARTER_END,
  },
  {
    id: "q-fundmon",
    frequency: "Quarterly",
    title: "Fund-monitoring review",
    check: "Performance, concentration, duration vs rate view",
    trigger: "Top-5 > 70% or any fund > 20% → trim",
    evidence: "§20",
    defaultStatus: "Due",
    defaultNextDue: QUARTER_END,
  },
  {
    id: "a-ips",
    frequency: "Annual",
    title: "Trustee investment-policy review",
    check: "Investment policy statement and strategic asset allocation",
    trigger: "No IPS or risk-tolerance mandate exists today (C10)",
    evidence: "§2, §20",
    defaultStatus: "Requires Trustee Decision",
    defaultNextDue: YEAR_END,
  },
  {
    id: "a-legal",
    frequency: "Annual",
    title: "Legal-framework review",
    check: "Circular 619, MPT Act s.35, s.11(5) / Rule 17C; tax review",
    trigger: "The legal reading has not been reviewed by a lawyer or chartered accountant",
    evidence: "§20, Disclaimer",
    defaultStatus: "Requires External Confirmation",
    defaultNextDue: YEAR_END,
  },
  {
    id: "a-sharia",
    frequency: "Annual",
    title: "Sharia-policy decision",
    check: "Whether to hold a Sharia sleeve and which standard (4% vs TASIS 2.5%)",
    trigger: "B9 preference; O9 standard unrecorded",
    evidence: "§11, §20, O9",
    defaultStatus: "Requires Trustee Decision",
    defaultNextDue: YEAR_END,
  },
  {
    id: "a-manager",
    frequency: "Annual",
    title: "Investment-manager review",
    check: "Fund-manager changes (HDFC Flexi new PM, ICICI manager changes)",
    trigger: "New manager < 12 months and underperforming → watch-list",
    evidence: "§20",
    defaultStatus: "Due",
    defaultNextDue: YEAR_END,
  },
]

export type DecisionStatus = "Pending" | "Approved" | "Deferred" | "Rejected"
export const DECISION_STATUSES: DecisionStatus[] = ["Pending", "Approved", "Deferred", "Rejected"]

export interface TrusteeDecision {
  id: string
  title: string
  category: "Recommended" | "Recommended — subject to confirmation" | "Optional — trustee decision" | "Conditional" | "Governance" | "Dashboard-identified"
  detail: string
  dependency?: string
  source: string
}

export const TRUSTEE_DECISIONS: TrusteeDecision[] = [
  {
    id: "d-direct",
    title: "Move all capital to Direct-Growth plans",
    category: "Recommended",
    detail: "Adopt a Direct-only plan-type policy; Regular plans are excluded by prudence.",
    source: "§23",
  },
  {
    id: "d-allocation",
    title: "Adopt the Core Growth 70/30 allocation (100% in funds)",
    category: "Recommended — subject to confirmation",
    detail: "Diversify out of the two-fund book into the Section 12 allocation; replace ABSL Liquid with ICICI Liquid.",
    dependency: "B17 / O2 — qualifying base-tier assets ≥ ₹6.46 cr held elsewhere",
    source: "§12, §23",
  },
  {
    id: "d-fallback",
    title: "Adopt the base-tier fallback if B17 is not confirmed",
    category: "Conditional",
    detail: "Scale the fund sleeve to ~45% of trust money and place ~₹2.91 cr in a direct G-Sec/SDL ladder and scheduled-bank FD ladder.",
    dependency: "B17 refuted or unconfirmed",
    source: "§13.4, §23",
  },
  {
    id: "d-sharia",
    title: "Hold the optional 5% Tata Ethical Sharia sleeve",
    category: "Optional — trustee decision",
    detail: "Priced in the proposal at ~₹1.5 L a year of expected-return opportunity cost (see reconciliation note).",
    dependency: "B9",
    source: "§11, §23",
  },
  {
    id: "d-sharia-standard",
    title: "Record the Sharia standard: fund 4% screen vs TASIS 2.5%",
    category: "Optional — trustee decision",
    detail: "A stricter standard changes which funds qualify.",
    dependency: "O9 / S3",
    source: "§11, §22",
  },
  {
    id: "d-monitoring",
    title: "Institute the §20 monitoring framework",
    category: "Recommended",
    detail: "Including the standing monthly Parag Parikh 65% Indian-listed check (L1).",
    source: "§20, §23",
  },
  {
    id: "d-ips",
    title: "Record an investment policy statement",
    category: "Governance",
    detail: "No IPS or trustee risk-tolerance mandate was available (C10); the objectives used are the analyst's inference.",
    source: "§2, §18",
  },
  {
    id: "d-amc",
    title: "Record a rationale for ICICI Prudential AMC concentration",
    category: "Dashboard-identified",
    detail: "ICICI Value 13% + ICICI Corporate Bond 14% + ICICI Liquid 6% = 33% in one AMC, above the ~32% guideline that requires a recorded rationale (§21).",
    source: "§12, §21 (computed)",
  },
]

/** Inconsistencies between printed figures and the arithmetic they imply. */
export const RECONCILIATION_FLAGS = [
  {
    id: "R1",
    title: "Regular → Direct fee saving",
    printed: "~0.8–1.0% p.a. avoidable ≈ ₹6–7 L a year (§8)",
    computed: "0.8–1.0% × ₹5.29 cr = ₹4.2–5.3 L a year",
    note: "The printed rupee figure is not reproduced by the printed rate on the printed portfolio value. The calculator uses the rate; the difference needs confirming (B16).",
  },
  {
    id: "R2",
    title: "Sharia sleeve opportunity cost",
    printed: "~2 pp on the 5% held ≈ ₹1.5 L a year; up to ~₹25 L for a fully Sharia corpus (§11)",
    computed: "2 pp × 5% × ₹5.29 cr = ₹0.53 L; ₹1.5 L implies ~5.7 pp and ₹25 L implies ~4.7 pp",
    note: "The simulator uses the stated 2 pp shortfall as an editable input and shows both figures.",
  },
  {
    id: "R3",
    title: "Proposed top-5 concentration",
    printed: "65% (§14)",
    computed: "69% across all holdings (17 + 14 + 14 + 13 + 11); 65% is the five largest equity holdings",
    note: "At 69% the proposal sits 1 pp below the §20 trigger (top-5 > 70% → trim).",
  },
  {
    id: "R4",
    title: "Unrealised gain total",
    printed: "₹1,21,15,528",
    computed: "Per-fund figures sum to ₹1,21,15,529",
    note: "₹1 rounding in the statement; immaterial.",
  },
] as const
