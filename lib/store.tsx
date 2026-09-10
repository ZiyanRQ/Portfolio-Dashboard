"use client"

import * as React from "react"

import { useAuth } from "@/lib/auth-client"
import { FUNDS } from "@/lib/data/funds"
import { PORTFOLIO_VALUE, RECOMMENDED_SLOTS, type Slot } from "@/lib/data/portfolio"
import {
  ACTION_STATUSES,
  type ActionStatus,
  type RecordChange,
  type RecordsResponse,
  type RecordTable,
  type SharedRecords,
  type TaskRecord,
} from "@/lib/data/records"
import { formatMoney, todayISO, type Currency, type FxRates, type MoneyOptions } from "@/lib/format"
import {
  buildActions,
  buildCurrent,
  buildFallback,
  buildFromSlots,
  buildTransition,
  compliance,
  computeMetrics,
  DEFAULT_ASSUMPTIONS,
  slotsTotal,
  type Assumptions,
  type Compliance,
  type Fallback,
  type Metrics,
  type PortfolioKey,
  type PresetKey,
  type ScenarioInputs,
  type StressMethod,
  type TradeAction,
  type Transition,
} from "@/lib/model"

export { ACTION_STATUSES }
export type { ActionStatus, TaskRecord }

interface RateSet extends FxRates {
  asOf: string | null
  source: string
}

export interface RecordsState {
  status: "loading" | "ready" | "saving" | "error"
  error: string | null
  version: number
  updatedAt: string | null
  updatedBy: string | null
  restricted: boolean
  writable: boolean
}

/**
 * Local inputs (builder, simulators, currency) live in this browser; the tables in
 * SharedRecords (trade statuses, tasks, decisions, register, open items, target)
 * are loaded from and saved to the server so every signed-in user sees the same.
 */
export interface DashboardState extends Omit<SharedRecords, "version" | "updatedAt" | "updatedBy"> {
  currency: Currency
  fxMode: "live" | "fixed"
  fixedRates: RateSet
  liveRates: (RateSet & { fetchedAt: string }) | null
  fxStatus: "idle" | "loading" | "error"
  portfolioView: PortfolioKey
  slots: Slot[]
  b17: number
  assumptions: Assumptions
  stressShock: number
  stressMethod: StressMethod
  rateShock: number
  liquidity: { payroll: number; other: number; months: 1 | 2 | 3 | 6; includeDebt: boolean }
  fees: { value: number | null; diff: number; years: number; gross: number | null }
  scenario: ScenarioInputs & { preset: PresetKey | "custom" }
  openFundId: string | null
  records: RecordsState
}

export const PLACEHOLDER_FX_SOURCE = "Indicative placeholder — not a market rate"

export const DEFAULT_STATE: DashboardState = {
  currency: "INR",
  fxMode: "fixed",
  fixedRates: { GBP: 118, USD: 88, asOf: null, source: PLACEHOLDER_FX_SOURCE },
  liveRates: null,
  fxStatus: "idle",
  portfolioView: "proposed",
  slots: RECOMMENDED_SLOTS,
  b17: 0,
  assumptions: DEFAULT_ASSUMPTIONS,
  stressShock: -20,
  stressMethod: "beta",
  rateShock: 1,
  implementationTarget: "proposed",
  actions: {},
  tasks: {},
  decisions: {},
  assumptionReg: {},
  openItems: {},
  liquidity: { payroll: 0, other: 0, months: 3, includeDebt: false },
  fees: { value: null, diff: 0.9, years: 10, gross: null },
  scenario: {
    preset: "base",
    equityWeight: 70,
    liquidityWeight: 6,
    equityReturn: 11,
    debtReturn: 7,
    liquidityReturn: 6.25,
    inflation: 4,
    rateChange: 0,
    year1Override: false,
    year1EquityReturn: 11,
    horizon: 10,
  },
  openFundId: null,
  records: {
    status: "loading",
    error: null,
    version: 0,
    updatedAt: null,
    updatedBy: null,
    restricted: true,
    writable: true,
  },
}

/** Keys never written to (or restored from) browser storage. */
const NON_LOCAL_KEYS = [
  "actions",
  "tasks",
  "decisions",
  "assumptionReg",
  "openItems",
  "implementationTarget",
  "records",
  "fxStatus",
  "openFundId",
] as const

function localOnly(s: Partial<DashboardState>): Partial<DashboardState> {
  const copy = { ...s } as Record<string, unknown>
  for (const k of NON_LOCAL_KEYS) delete copy[k]
  return copy as Partial<DashboardState>
}

type Action =
  | { type: "hydrate"; saved: Partial<DashboardState> }
  | { type: "set"; patch: Partial<DashboardState> }
  | { type: "assumption"; key: keyof Assumptions; value: number }
  | { type: "slotWeight"; slotId: string; weight: number }
  | { type: "slotFund"; slotId: string; fundId: string }
  | { type: "addSlot"; fundId: string; weight: number }
  | { type: "removeSlot"; slotId: string }
  | { type: "slots"; slots: Slot[] }
  | { type: "record"; table: RecordTable; id: string; patch: Record<string, unknown> }
  | { type: "records"; data: RecordsResponse }
  | { type: "recordsStatus"; status: RecordsState["status"]; error?: string | null }
  | { type: "fxLoaded"; rates: RateSet & { fetchedAt: string } }
  | { type: "resetAll" }

const KNOWN_FUNDS = new Set(FUNDS.map((f) => f.id))

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case "hydrate": {
      const s = localOnly(action.saved)
      const slots = Array.isArray(s.slots) ? s.slots.filter((x) => KNOWN_FUNDS.has(x.fundId)) : state.slots
      return {
        ...state,
        ...s,
        slots,
        assumptions: { ...DEFAULT_ASSUMPTIONS, ...s.assumptions },
        liquidity: { ...state.liquidity, ...s.liquidity },
        fees: { ...state.fees, ...s.fees },
        scenario: { ...state.scenario, ...s.scenario },
        fixedRates: { ...state.fixedRates, ...s.fixedRates },
      }
    }
    case "set":
      return { ...state, ...action.patch }
    case "assumption":
      return { ...state, assumptions: { ...state.assumptions, [action.key]: action.value } }
    case "slotWeight":
      return {
        ...state,
        slots: state.slots.map((s) => (s.slotId === action.slotId ? { ...s, weight: action.weight } : s)),
      }
    case "slotFund":
      return {
        ...state,
        slots: state.slots.map((s) => (s.slotId === action.slotId ? { ...s, fundId: action.fundId } : s)),
      }
    case "addSlot":
      return {
        ...state,
        slots: [...state.slots, { slotId: `u-${action.fundId}-${state.slots.length}`, fundId: action.fundId, weight: action.weight }],
      }
    case "removeSlot":
      return { ...state, slots: state.slots.filter((s) => s.slotId !== action.slotId) }
    case "slots":
      return { ...state, slots: action.slots }
    case "record": {
      const table = state[action.table] as Record<string, Record<string, unknown>>
      return {
        ...state,
        [action.table]: { ...table, [action.id]: { ...table[action.id], ...action.patch } },
      }
    }
    case "records": {
      const d = action.data
      return {
        ...state,
        implementationTarget: d.implementationTarget,
        actions: d.actions,
        tasks: d.tasks,
        decisions: d.decisions,
        assumptionReg: d.assumptionReg,
        openItems: d.openItems,
        records: {
          status: "ready",
          error: null,
          version: d.version,
          updatedAt: d.updatedAt,
          updatedBy: d.updatedBy,
          restricted: d.restricted,
          writable: d.writable,
        },
      }
    }
    case "recordsStatus":
      return { ...state, records: { ...state.records, status: action.status, error: action.error ?? null } }
    case "fxLoaded": {
      const seedFixed = state.fixedRates.source === PLACEHOLDER_FX_SOURCE
      return {
        ...state,
        fxStatus: "idle",
        liveRates: action.rates,
        fixedRates: seedFixed
          ? {
              GBP: Number(action.rates.GBP.toFixed(2)),
              USD: Number(action.rates.USD.toFixed(2)),
              asOf: action.rates.asOf,
              source: `Locked from ${action.rates.source}`,
            }
          : state.fixedRates,
      }
    }
    case "resetAll": {
      // Resets this browser's inputs only; shared records are untouched.
      const shared: Partial<DashboardState> = {}
      for (const k of NON_LOCAL_KEYS) Object.assign(shared, { [k]: state[k] })
      return {
        ...DEFAULT_STATE,
        ...shared,
        liveRates: state.liveRates,
        fixedRates: state.fixedRates,
        currency: state.currency,
        fxMode: state.fxMode,
        openFundId: null,
      }
    }
  }
}

async function fetchRates(): Promise<RateSet & { fetchedAt: string }> {
  const r = await fetch("/api/fx")
  if (!r.ok) throw new Error(String(r.status))
  const j = (await r.json()) as { GBP: number; USD: number; asOf: string; source: string }
  return { ...j, fetchedAt: new Date().toISOString() }
}

export interface Model {
  current: Metrics
  proposed: Metrics
  recommended: Metrics
  fallback: Metrics
  fallbackInfo: Fallback
  byKey: Record<PortfolioKey, Metrics>
  selected: Metrics
  compliance: Record<PortfolioKey, Compliance>
  recommendedCompliance: Compliance
  actions: TradeAction[]
  transition: Transition
  transitionMetrics: Metrics
  transitionCompliance: Compliance
  slotsTotal: number
  modified: boolean
}

function buildModel(s: DashboardState): Model {
  const a = s.assumptions
  const current = computeMetrics(buildCurrent(), a)
  const proposedPositions = buildFromSlots(s.slots)
  const proposed = computeMetrics(proposedPositions, a)
  const recommended = computeMetrics(buildFromSlots(RECOMMENDED_SLOTS), a)
  const fallbackInfo = buildFallback(proposedPositions, s.b17, a)
  const fallback = computeMetrics(fallbackInfo.positions, a)
  const byKey = { current, proposed, fallback }
  const comp = (m: Metrics) => compliance(m.c619 * m.value, PORTFOLIO_VALUE, s.b17, a)
  const actions = buildActions(s.implementationTarget === "fallback" ? fallbackInfo.positions : proposedPositions)
  const transition = buildTransition(actions, (id) => s.actions[id]?.status === "Complete")
  const transitionMetrics = computeMetrics(transition.positions, a)
  const modified =
    s.slots.length !== RECOMMENDED_SLOTS.length ||
    s.slots.some((x, i) => x.fundId !== RECOMMENDED_SLOTS[i].fundId || x.weight !== RECOMMENDED_SLOTS[i].weight)
  return {
    current,
    proposed,
    recommended,
    fallback,
    fallbackInfo,
    byKey,
    selected: byKey[s.portfolioView],
    compliance: { current: comp(current), proposed: comp(proposed), fallback: comp(fallback) },
    recommendedCompliance: comp(recommended),
    actions,
    transition,
    transitionMetrics,
    transitionCompliance: comp(transitionMetrics),
    slotsTotal: slotsTotal(s.slots),
    modified,
  }
}

interface DashboardContextValue {
  state: DashboardState
  model: Model
  rates: FxRates
  rateInfo: { mode: "live" | "fixed"; asOf: string | null; source: string }
  money: (inr: number, opts?: MoneyOptions) => string
  /** True when the signed-in user can change shared records. */
  canEditRecords: boolean
  set: (patch: Partial<DashboardState>) => void
  setAssumption: (key: keyof Assumptions, value: number) => void
  setSlotWeight: (slotId: string, weight: number) => void
  setSlotFund: (slotId: string, fundId: string) => void
  addSlot: (fundId: string, weight?: number) => void
  removeSlot: (slotId: string) => void
  setSlots: (slots: Slot[]) => void
  resetSlots: () => void
  setRecord: (table: RecordTable, id: string, patch: Record<string, unknown>) => void
  resetRecords: (table: RecordTable) => void
  setImplementationTarget: (value: "proposed" | "fallback") => void
  reloadRecords: () => void
  resetAll: () => void
  refreshFx: () => void
  openFund: (id: string | null) => void
}

const DashboardContext = React.createContext<DashboardContextValue | null>(null)

const STORAGE_KEY = "tpa-dashboard:v1"
const SAVE_DELAY_MS = 600
const POLL_MS = 30_000

function changeKey(c: RecordChange) {
  return c.kind === "patch" ? `${c.table}:${c.id}` : c.kind === "reset" ? `reset:${c.table}` : "target"
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, DEFAULT_STATE)
  const { user, loading: authLoading } = useAuth()
  const hydrated = React.useRef(false)
  const pending = React.useRef(new Map<string, RecordChange>())
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshFx = React.useCallback(() => {
    dispatch({ type: "set", patch: { fxStatus: "loading" } })
    fetchRates()
      .then((rates) => dispatch({ type: "fxLoaded", rates }))
      .catch(() => dispatch({ type: "set", patch: { fxStatus: "error" } }))
  }, [])

  const loadRecords = React.useCallback(async () => {
    try {
      const r = await fetch("/api/records", { cache: "no-store" })
      if (!r.ok) throw new Error(String(r.status))
      const data = (await r.json()) as RecordsResponse
      // Never overwrite edits that are still waiting to be saved.
      if (pending.current.size === 0) dispatch({ type: "records", data })
    } catch {
      dispatch({ type: "recordsStatus", status: "error", error: "Could not load shared records" })
    }
  }, [])

  const flush = React.useCallback(
    (keepalive = false) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = null
      const changes = [...pending.current.values()]
      pending.current.clear()
      if (changes.length === 0) return
      dispatch({ type: "recordsStatus", status: "saving" })
      changes
        .reduce<Promise<RecordsResponse | null>>(
          (prev, change) =>
            prev.then(async () => {
              const r = await fetch("/api/records", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(change),
                keepalive,
              })
              const body = (await r.json().catch(() => ({}))) as RecordsResponse & { error?: string }
              if (!r.ok) throw new Error(body.error ?? `Save failed (${r.status})`)
              return body
            }),
          Promise.resolve(null)
        )
        .then((data) => {
          if (data && pending.current.size === 0) dispatch({ type: "records", data })
        })
        .catch(async (e: Error) => {
          // Revert to the server's copy, then keep the error visible.
          await loadRecords()
          dispatch({ type: "recordsStatus", status: "error", error: `Not saved — ${e.message}` })
        })
    },
    [loadRecords]
  )

  const queue = React.useCallback(
    (change: RecordChange) => {
      const key = changeKey(change)
      const prior = pending.current.get(key)
      if (change.kind === "reset") {
        for (const k of [...pending.current.keys()]) if (k.startsWith(`${change.table}:`)) pending.current.delete(k)
      }
      pending.current.set(
        key,
        prior?.kind === "patch" && change.kind === "patch" ? { ...change, patch: { ...prior.patch, ...change.patch } } : change
      )
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => flush(), SAVE_DELAY_MS)
    },
    [flush]
  )

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) dispatch({ type: "hydrate", saved: JSON.parse(raw) as Partial<DashboardState> })
    } catch {
      // Storage unavailable or corrupt — run on defaults.
    }
    hydrated.current = true
    refreshFx()
  }, [refreshFx])

  React.useEffect(() => {
    if (!hydrated.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localOnly(state)))
    } catch {
      // Ignore quota / privacy-mode failures.
    }
  }, [state])

  // Load shared records once auth is known, whenever the user changes, on focus and every 30 s.
  React.useEffect(() => {
    if (authLoading) return
    loadRecords()
    const poll = setInterval(loadRecords, POLL_MS)
    const onFocus = () => loadRecords()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [authLoading, user, loadRecords])

  // Send anything still queued if the tab is closed or navigated away.
  React.useEffect(() => {
    const onHide = () => flush(true)
    window.addEventListener("pagehide", onHide)
    return () => window.removeEventListener("pagehide", onHide)
  }, [flush])

  const model = React.useMemo(() => buildModel(state), [state])

  const useLive = state.fxMode === "live" && state.liveRates !== null
  const rateSet: RateSet = useLive && state.liveRates ? state.liveRates : state.fixedRates
  const rates = React.useMemo(() => ({ GBP: rateSet.GBP, USD: rateSet.USD }), [rateSet.GBP, rateSet.USD])
  const canEditRecords = user !== null && state.records.writable

  const value = React.useMemo<DashboardContextValue>(
    () => ({
      state,
      model,
      rates,
      rateInfo: { mode: useLive ? "live" : "fixed", asOf: rateSet.asOf, source: rateSet.source },
      money: (inr, opts) => formatMoney(inr, state.currency, rates, opts),
      canEditRecords,
      set: (patch) => dispatch({ type: "set", patch }),
      setAssumption: (key, v) => dispatch({ type: "assumption", key, value: v }),
      setSlotWeight: (slotId, weight) => dispatch({ type: "slotWeight", slotId, weight }),
      setSlotFund: (slotId, fundId) => dispatch({ type: "slotFund", slotId, fundId }),
      addSlot: (fundId, weight = 0) => dispatch({ type: "addSlot", fundId, weight }),
      removeSlot: (slotId) => dispatch({ type: "removeSlot", slotId }),
      setSlots: (slots) => dispatch({ type: "slots", slots }),
      resetSlots: () => dispatch({ type: "slots", slots: RECOMMENDED_SLOTS }),
      setRecord: (table, id, patch) => {
        if (!canEditRecords) return
        dispatch({ type: "record", table, id, patch })
        queue({ kind: "patch", table, id, patch })
      },
      resetRecords: (table) => {
        if (!canEditRecords) return
        dispatch({ type: "set", patch: { [table]: {} } as Partial<DashboardState> })
        queue({ kind: "reset", table })
      },
      setImplementationTarget: (v) => {
        if (!canEditRecords) return
        dispatch({ type: "set", patch: { implementationTarget: v } })
        queue({ kind: "target", value: v })
      },
      reloadRecords: () => {
        loadRecords()
      },
      resetAll: () => dispatch({ type: "resetAll" }),
      refreshFx,
      openFund: (id) => dispatch({ type: "set", patch: { openFundId: id } }),
    }),
    [state, model, rates, useLive, rateSet.asOf, rateSet.source, canEditRecords, queue, loadRecords, refreshFx]
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const ctx = React.useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider")
  return ctx
}

export { todayISO }
