/**
 * Legal framework, assumption register and open items — Sections 3–5, 22,
 * Appendices A–C and J of the proposal. Legal research, not legal advice.
 */

export const C619_CATEGORIES = [
  { clause: "(a)", text: "Government securities", note: "Base tier when held directly" },
  { clause: "(b)", text: "Central/State-guaranteed securities", note: "Base tier when held directly" },
  { clause: "(c)", text: "Units of debt mutual funds (SEBI)", note: "Circular 619 (capped) tier" },
  { clause: "(d)", text: "Listed debt securities, 3-yr residual maturity", note: "AA ratings proviso (two agencies)" },
  { clause: "(e)", text: "Basel III Tier-1 (AT1) bonds", note: "Excluded on prudence" },
  { clause: "(f)", text: "Infrastructure debt / IDF-MF units", note: "Excluded conservatively" },
  { clause: "(g)", text: "Listed shares, market cap ≥ ₹5,000 cr", note: "The direct-share trap — fails Gate 2 unless PSU" },
  { clause: "(h)", text: "MF units with ≥65% in Indian-listed shares", note: "Equity funds qualify here" },
  { clause: "(i)", text: "ETFs / index funds replicating Sensex-30 or Nifty-50", note: "Passive universe (B5)" },
] as const

export type GateResult = "pass" | "conditional" | "fail" | "excluded" | "confirm"

export interface Instrument {
  id: string
  name: string
  group: "Requested" | "Additional traps"
  gate1: GateResult
  gate1Basis: string
  gate2: GateResult
  gate2Basis: string
  tier: "Base tier" | "Circular 619 tier" | "Not investable" | "Requires confirmation"
  consumesCapacity: boolean | null
  note: string
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: "equity-mf",
    name: "Equity mutual fund",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "Circular 619 clause (h) — MF units with ≥65% in Indian-listed shares",
    gate2: "pass",
    gate2Basis: "Rule 17C(i) — units of any scheme of a s.10(23D) mutual fund",
    tier: "Circular 619 tier",
    consumesCapacity: true,
    note: "The 65% test is applied to actual Indian-listed holdings (B6). Funds with foreign sleeves (Parag Parikh) need a monthly check.",
  },
  {
    id: "debt-mf",
    name: "Debt mutual fund",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "Circular 619 clause (c) — units of debt mutual funds",
    gate2: "pass",
    gate2Basis: "Rule 17C(i)",
    tier: "Circular 619 tier",
    consumesCapacity: true,
    note: "Both source documents wrongly stated tax law permits only debt funds; Rule 17C(i) permits units of any scheme.",
  },
  {
    id: "nifty-index",
    name: "Nifty 50 index fund / ETF",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "Circular 619 clause (i) — replicates Nifty-50 or Sensex-30 (B5: read as these two indices only)",
    gate2: "pass",
    gate2Basis: "Rule 17C(i)",
    tier: "Circular 619 tier",
    consumesCapacity: true,
    note: "Clause (i) has long been read as Nifty-50/Sensex-30 only (RR-07).",
  },
  {
    id: "direct-gsec",
    name: "Direct G-Sec (incl. T-Bills, SDLs)",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "MPT Act s.35 base position — \"public securities\" as defined in s.2(12)",
    gate2: "pass",
    gate2Basis: "s.11(5)(ii) — government securities",
    tier: "Base tier",
    consumesCapacity: false,
    note: "Identical exposure to a gilt fund, but consumes no Circular 619 capacity and carries no expense ratio.",
  },
  {
    id: "gilt-mf",
    name: "Gilt mutual fund",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "Circular 619 clause (c) — the fund wrapper, not its G-Sec holdings, sets the tier",
    gate2: "pass",
    gate2Basis: "Rule 17C(i)",
    tier: "Circular 619 tier",
    consumesCapacity: true,
    note: "Worked example (§5): same bonds as a direct G-Sec, opposite regulatory cost.",
  },
  {
    id: "bank-deposit",
    name: "Scheduled-bank deposit",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "MPT Act s.35 — deposit in a Scheduled Bank; base tier, uncapped",
    gate2: "pass",
    gate2Basis: "s.11(5)(iii) — deposits with a scheduled bank",
    tier: "Base tier",
    consumesCapacity: false,
    note: "A trust could hold 100% here — the base tier has no ceiling.",
  },
  {
    id: "psu-share",
    name: "PSU share",
    group: "Requested",
    gate1: "conditional",
    gate1Basis: "Circular 619 clause (g) — listed shares with market cap ≥ ₹5,000 cr",
    gate2: "pass",
    gate2Basis: "s.11(5)(vii) — shares of public-sector companies",
    tier: "Circular 619 tier",
    consumesCapacity: true,
    note: "Passes only where the company's market capitalisation is at least ₹5,000 cr.",
  },
  {
    id: "corporate-bond",
    name: "Corporate bond (private issuer, held directly)",
    group: "Requested",
    gate1: "conditional",
    gate1Basis: "Circular 619 clause (d) — listed debt; AA rating from at least two SEBI-registered agencies (two lowest count)",
    gate2: "fail",
    gate2Basis: "Not a permitted s.11(5) mode — only PSU / notified-issuer securities qualify (s.11(5)(vii))",
    tier: "Not investable",
    consumesCapacity: null,
    note: "\"Issuer-vs-ratings mismatch\" (§23). Corporate-bond exposure is taken through a debt mutual fund instead (clause (c) + Rule 17C(i)).",
  },
  {
    id: "govt-guaranteed",
    name: "Government-guaranteed security",
    group: "Requested",
    gate1: "pass",
    gate1Basis: "Public security (s.2(12)); also Circular 619 category (b) — base tier when held directly",
    gate2: "pass",
    gate2Basis: "s.11(5)(ii)/(v) — as grouped in Appendix C",
    tier: "Base tier",
    consumesCapacity: false,
    note: "Held directly it sits in the base tier.",
  },
  {
    id: "psu-bond",
    name: "PSU bond",
    group: "Additional traps",
    gate1: "confirm",
    gate1Basis: "Circular 619 clause (g) / public security — classification unresolved",
    gate2: "pass",
    gate2Basis: "s.11(5)(vii) — PSU / notified-issuer securities",
    tier: "Requires confirmation",
    consumesCapacity: null,
    note: "Open item O3: reading the bare text of s.2(12) decides whether PSU bonds are base tier (uncapped) or capped — the one yield pickup for the uncapped tier.",
  },
  {
    id: "direct-share",
    name: "Direct non-PSU listed share",
    group: "Additional traps",
    gate1: "conditional",
    gate1Basis: "Circular 619 clause (g) — market cap ≥ ₹5,000 cr",
    gate2: "fail",
    gate2Basis: "s.11(5)(vii) permits shares of public-sector companies only",
    tier: "Not investable",
    consumesCapacity: null,
    note: "The direct-share trap: allowed by the Circular, not by tax law.",
  },
  {
    id: "at1",
    name: "Basel III AT1 bond",
    group: "Additional traps",
    gate1: "excluded",
    gate1Basis: "Circular 619 clause (e) — excluded on prudence",
    gate2: "excluded",
    gate2Basis: "Not assessed — excluded on prudence",
    tier: "Not investable",
    consumesCapacity: null,
    note: "Allowed by both texts in principle but rejected on prudence (§6.3).",
  },
  {
    id: "hybrid",
    name: "Balanced-advantage / hybrid / multi-asset fund",
    group: "Additional traps",
    gate1: "fail",
    gate1Basis: "Falls between the Circular's categories — neither clause (c) nor (h)",
    gate2: "pass",
    gate2Basis: "Rule 17C(i)",
    tier: "Not investable",
    consumesCapacity: null,
    note: "Permitted by tax law, not by the Circular.",
  },
  {
    id: "gold-etf",
    name: "Gold / silver ETF",
    group: "Additional traps",
    gate1: "fail",
    gate1Basis: "Not within the nine Circular 619 categories",
    gate2: "fail",
    gate2Basis: "Not permitted (Appendix C)",
    tier: "Not investable",
    consumesCapacity: null,
    note: "Also excluded: international FoFs, AIFs, PMS, derivatives, NSC/PPF/KVP (Appendix C).",
  },
]

export const ASSUMPTION_STATUSES = ["Adopted", "Confirmed", "Unconfirmed", "Open item", "Trustee decision"] as const
export type AssumptionStatus = (typeof ASSUMPTION_STATUSES)[number]
export type Priority = "Critical" | "High" | "Medium" | "Low"

export interface Assumption {
  id: string
  text: string
  direction: string
  confidence: string
  status: AssumptionStatus
  evidence: string
  impact: string
  priority: Priority
  openItem?: string
}

/** Appendix J, extended with the evidence and impact described in §3, §22. */
export const ASSUMPTIONS: Assumption[] = [
  { id: "B1", text: "Society is a public trust under the MPT Act; s.35 applies", direction: "If wrong, Gate 1 vanishes", confidence: "High", status: "Adopted", evidence: "Charitable educational public trust in {location} (§1.1)", impact: "Whole Gate 1 analysis, including the 50% cap", priority: "High" },
  { id: "B2", text: "Registered under s.12AB (or 10(23C)(vi)); (iiiad) unavailable", direction: "No effect on universe", confidence: "High", status: "Adopted", evidence: "Registration record (not reproduced)", impact: "None on the investable universe", priority: "Low" },
  { id: "B3", text: "50% cap: collective, market value, continuous", direction: "Conservative", confidence: "Medium", status: "Adopted", evidence: "Circular 619 is silent; most restrictive reading adopted (§3.1)", impact: "Creates the need for the 45% working-ceiling buffer", priority: "High" },
  { id: "B4", text: "\"Trust money\" = investable financial assets, not total property", direction: "Conservative", confidence: "Medium-High", status: "Open item", evidence: "Taken as the ~₹5.29 cr portfolio (§3.2)", impact: "Sets the denominator of the cap — how much may sit in funds at all", priority: "High", openItem: "O1" },
  { id: "B5", text: "Clause (i) = Nifty 50 & Sensex 30 only", direction: "Conservative", confidence: "Medium-High", status: "Adopted", evidence: "MoF (DEA) 2015 provenance; RR-07", impact: "Limits the passive universe to Nifty 50 / Sensex 30 trackers", priority: "Medium" },
  { id: "B6", text: "65% tested on actual Indian-listed holdings", direction: "Conservative; moot in practice (all pass)", confidence: "Medium-High", status: "Adopted", evidence: "All 22 funds pass; Parag Parikh by ~5.7 pts", impact: "Drives the monthly L1 check on Parag Parikh", priority: "Medium", openItem: "O4" },
  { id: "B7", text: "No FCRA / no foreign contribution", direction: "Confirmed nil (RR-11)", confidence: "High", status: "Confirmed", evidence: "RR-11", impact: "No FCRA-driven investment restrictions", priority: "Low" },
  { id: "B8", text: "Portfolio is long-horizon money, no fixed deadline", direction: "If Form 10 money exists, shorter duration needed", confidence: "Medium", status: "Open item", evidence: "Corpus composition by application status not confirmed", impact: "5-year-deadline money is unsuited to equity regardless of the cap", priority: "High", openItem: "O12" },
  { id: "B9", text: "Sharia is a preference, not a constraint", direction: "Priced, not assumed", confidence: "Medium", status: "Trustee decision", evidence: "No deed, donor or trustee requirement in the record (§11)", impact: "Sharia sleeve sized at an optional 5%", priority: "Medium", openItem: "O9" },
  { id: "B10", text: "Zero-interest current account satisfies s.35 & 11(5)(iii)", direction: "Enables a Sharia base tier", confidence: "Zero on the fact", status: "Unconfirmed", evidence: "Cited non-interest wording absent from the current Taurus SID (S2)", impact: "Only relevant to a fuller Sharia expression", priority: "Low", openItem: "O7" },
  { id: "B11", text: "Existing holdings not specially sanctioned; pre-date the Circular", direction: "Transition, not universe", confidence: "Zero on the basis", status: "Adopted", evidence: "Commentary: pre-existing holdings need not be force-unwound (§7)", impact: "Supports orderly remediation rather than forced sale", priority: "Medium" },
  { id: "B12", text: "LLP out of scope", direction: "Removes ₹1.97 cr and a false constraint", confidence: "Medium", status: "Adopted", evidence: "{relatedEntity} is a separate legal entity (§6)", impact: "Excludes ₹1.97 cr (two HDFC funds) from the analysis", priority: "Low" },
  { id: "B13", text: "The distributor ({adviser}) acts on Regular plans", direction: "Cost, not universe → Direct", confidence: "High", status: "Adopted", evidence: "All holdings are Regular plans (§6)", impact: "Basis of the Direct-plan fee saving", priority: "Low" },
  { id: "B14", text: "Liquidity sized from the fee cycle, not a % of this portfolio", direction: "Moderate", confidence: "Medium", status: "Unconfirmed", evidence: "No fee-cycle or payroll data available (C10)", impact: "Whether 6% liquidity is adequate cannot be tested from the record", priority: "Medium" },
  { id: "B15", text: "Deed contains no investment restriction beyond statute", direction: "Could only narrow the universe", confidence: "Medium", status: "Unconfirmed", evidence: "Deed not reviewed", impact: "A deed restriction could remove funds from the universe", priority: "Medium" },
  { id: "B16", text: "Financial-model inputs are estimates", direction: "Scale, not universe", confidence: "High on the inconsistencies", status: "Adopted", evidence: "Source documents contained errors (e.g. ABSL gain ten-fold error)", impact: "Fee, return and cost figures are illustrative", priority: "Medium" },
  { id: "B17", text: "Qualifying base-tier assets ≥ ₹6.46 cr held elsewhere", direction: "Pivotal — enables the 100%-fund portfolio", confidence: "Unconfirmed", status: "Unconfirmed", evidence: "No bank / G-Sec balances outside this portfolio evidenced yet", impact: "Decides whether the portfolio may stay 100% in funds or must place ~₹2.91 cr in the base tier", priority: "Critical", openItem: "O2" },
]

/** Portfolio conclusions and the assumptions each rests on (dependency diagram). */
export const CONCLUSIONS = [
  { id: "C1", label: "100%-fund Core Growth portfolio is cap-compliant", deps: ["B17", "B4", "B3", "B1"], critical: true },
  { id: "C2", label: "Current portfolio breaches the 50% cap", deps: ["B4", "B3", "B1"] },
  { id: "C3", label: "Fallback migration of ~₹2.91 cr", deps: ["B17", "B4", "B3"], critical: true },
  { id: "C4", label: "Nifty 50 tracker is clause (i) compliant", deps: ["B5"] },
  { id: "C5", label: "Parag Parikh qualifies under clause (h)", deps: ["B6"] },
  { id: "C6", label: "70% equity suits the horizon", deps: ["B8", "B15"] },
  { id: "C7", label: "6% liquidity is adequate", deps: ["B14", "B8"] },
  { id: "C8", label: "Direct plans save ~0.8–1.0% p.a.", deps: ["B13", "B16"] },
  { id: "C9", label: "Sharia sleeve is optional at 5%", deps: ["B9", "B10"] },
  { id: "C10", label: "Orderly remediation, not forced sale", deps: ["B11", "B2"] },
  { id: "C11", label: "Scope = Society portfolio only", deps: ["B12", "B7"] },
] as const

export const OPEN_ITEM_STATUSES = ["Open", "Control", "Trustee", "Partly closed", "Closed"] as const
export type OpenItemStatus = (typeof OPEN_ITEM_STATUSES)[number]

export interface OpenItem {
  id: string
  issue: string
  why: string
  action: string
  status: OpenItemStatus
  assumption?: string
}

export const OPEN_ITEMS: OpenItem[] = [
  { id: "O1", issue: "₹5.29 cr denominator (B4)", why: "Sets how much may sit in funds. If wider, the cap is looser.", action: "Confirm the Society's investable financial assets", status: "Open", assumption: "B4" },
  { id: "O2", issue: "Qualifying base-tier assets held elsewhere (B17)", why: "Pivotal. If ≥ ₹6.46 cr, the 100%-fund portfolio is compliant; if not, migrate ~₹2.91 cr.", action: "Confirm bank / G-Sec balances outside this portfolio", status: "Open", assumption: "B17" },
  { id: "O3", issue: "PSU bond / public-security classification", why: "Determines whether PSU bonds are base tier or capped; the one yield pickup for the uncapped tier.", action: "Read s.2(12) bare text (A2)", status: "Open" },
  { id: "O4", issue: "Parag Parikh monthly Gate-1 (L1)", why: "Clears 65% by ~5.7 pts; could dip below in a future month.", action: "Institute a standing monthly check", status: "Control", assumption: "B6" },
  { id: "O5", issue: "Taurus Shariah supervisor (S1)", why: "No named binding supervisor; Sharia assurance unproven.", action: "Written confirmation from Taurus AMC", status: "Open" },
  { id: "O6", issue: "Quantum Shariah supervisor (S1)", why: "Same; plus interest-bearing TREPS.", action: "Written confirmation from Quantum AMC", status: "Open" },
  { id: "O7", issue: "Taurus B10 current-account evidence (S2)", why: "The cited non-interest wording is absent from the current SID.", action: "Re-source or obtain written confirmation", status: "Open", assumption: "B10" },
  { id: "O8", issue: "Quantum purification policy (S5)", why: "~6.9% interest-bearing TREPS with no stated purification.", action: "Confirm policy with AMC", status: "Open" },
  { id: "O9", issue: "TASIS 2.5% vs fund 4% screen (S3)", why: "Changes which funds qualify under a stricter standard.", action: "Trustee decision to record", status: "Trustee", assumption: "B9" },
  { id: "O10", issue: "Exact regression alpha/beta; Sharpe/Sortino; max drawdown", why: "Holdings-based proxies are computed (§14.2), but exact statistics need a return/covariance series.", action: "Compile monthly NAV + benchmark return series; compute covariance/drawdown", status: "Partly closed" },
  { id: "O11", issue: "Stale / empty factsheets", why: "HDFC Short Duration factsheet ~13 months old; ICICI Focused/Gilt AMC files empty.", action: "Refresh where they affect the final proposal", status: "Open" },
  { id: "O12", issue: "Form 10 accumulation money (B8)", why: "5-year-deadline money is unsuited to equity regardless of the cap.", action: "Confirm corpus composition by application status", status: "Open", assumption: "B8" },
]

export const BREACH_CONSEQUENCES = [
  { ref: "s.13(1)(d)", text: "Funds invested outside the s.11(5) modes lose exemption on that investment's income — not on the whole trust (Sheth Mafatlal Gagalbhai Foundation, Bombay HC; Fr. Mullers, Karnataka HC)." },
  { ref: "s.115BBI", text: "Such income is taxed at 30% with no deductions." },
  { ref: "s.271AAE", text: "A penalty can apply to specified violations." },
  { ref: "85% test", text: "Non-conforming income is both taxed and excluded from the 85% application computation — the cost compounds." },
  { ref: "s.11(1A)", text: "Capital gains reinvested into another capital asset (MF units, immovable property) may be deemed applied — why the all-fund reinvestment path is clean." },
] as const
