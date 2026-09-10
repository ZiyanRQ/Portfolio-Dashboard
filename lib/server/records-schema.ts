/** Validates incoming record changes — only known records and whitelisted fields are accepted. */
import { DECISION_STATUSES, MONITORING_TASKS, TASK_STATUSES, TRUSTEE_DECISIONS } from "@/lib/data/governance"
import { ASSUMPTION_STATUSES, ASSUMPTIONS, OPEN_ITEM_STATUSES, OPEN_ITEMS } from "@/lib/data/legal"
import { ACTION_STATUSES, RECORD_TABLES, type RecordChange, type RecordTable } from "@/lib/data/records"

type Check = (v: unknown) => boolean

const isDate: Check = (v) => v === null || v === "" || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))
const text = (max: number): Check => (v) => typeof v === "string" && v.length <= max
const oneOf = (list: readonly string[]): Check => (v) => typeof v === "string" && list.includes(v)

const FIELDS: Record<RecordTable, Record<string, Check>> = {
  actions: { status: oneOf(ACTION_STATUSES), date: isDate },
  tasks: { status: oneOf(TASK_STATUSES), owner: text(80), lastCompleted: isDate, nextDue: isDate, notes: text(500) },
  decisions: { status: oneOf(DECISION_STATUSES), note: text(1000) },
  assumptionReg: { status: oneOf(ASSUMPTION_STATUSES), responsible: text(80), lastVerified: isDate },
  openItems: { status: oneOf(OPEN_ITEM_STATUSES), owner: text(80), note: text(500) },
}

const IDS: Record<RecordTable, (id: string) => boolean> = {
  actions: (id) => /^(exit|trim|add|increase|switch):[a-z0-9-]{1,40}$/.test(id),
  tasks: (id) => MONITORING_TASKS.some((t) => t.id === id),
  decisions: (id) => TRUSTEE_DECISIONS.some((d) => d.id === id),
  assumptionReg: (id) => ASSUMPTIONS.some((a) => a.id === id),
  openItems: (id) => OPEN_ITEMS.some((o) => o.id === id),
}

export function parseChange(body: unknown): RecordChange | string {
  if (!body || typeof body !== "object") return "Invalid request"
  const b = body as Record<string, unknown>
  if (b.kind === "target") {
    return b.value === "proposed" || b.value === "fallback" ? { kind: "target", value: b.value } : "Invalid target"
  }
  if (typeof b.table !== "string" || !(RECORD_TABLES as readonly string[]).includes(b.table)) return "Unknown record table"
  const table = b.table as RecordTable
  if (b.kind === "reset") return { kind: "reset", table }
  if (b.kind !== "patch") return "Unknown change"
  if (typeof b.id !== "string" || !IDS[table](b.id)) return "Unknown record"
  if (!b.patch || typeof b.patch !== "object" || Array.isArray(b.patch)) return "Invalid change"
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(b.patch as Record<string, unknown>)) {
    const check = FIELDS[table][key]
    if (!check || !check(value)) return `Invalid value for “${key}”`
    patch[key] = value
  }
  if (Object.keys(patch).length === 0) return "Nothing to change"
  return { kind: "patch", table, id: b.id, patch }
}
