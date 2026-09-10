/**
 * Shared records — the editable governance data every signed-in user sees:
 * trade statuses, monitoring tasks, trustee decisions, the assumption register,
 * open items and the implementation target. Types shared by client and server.
 */
import type { DecisionStatus, TaskStatus } from "@/lib/data/governance"
import type { AssumptionStatus, OpenItemStatus } from "@/lib/data/legal"

export const ACTION_STATUSES = ["Not started", "In progress", "Complete", "Blocked"] as const
export type ActionStatus = (typeof ACTION_STATUSES)[number]

export const RECORD_TABLES = ["actions", "tasks", "decisions", "assumptionReg", "openItems"] as const
export type RecordTable = (typeof RECORD_TABLES)[number]

/** Tables anyone can read; everything else needs a signed-in user. */
export const PUBLIC_TABLES: RecordTable[] = ["assumptionReg"]

export interface TaskRecord {
  status?: TaskStatus
  owner?: string
  lastCompleted?: string
  nextDue?: string
  notes?: string
}

export interface SharedRecords {
  version: number
  updatedAt: string | null
  updatedBy: string | null
  implementationTarget: "proposed" | "fallback"
  actions: Record<string, { status: ActionStatus; date: string | null }>
  tasks: Record<string, TaskRecord>
  decisions: Record<string, { status: DecisionStatus; note: string }>
  assumptionReg: Record<string, { status?: AssumptionStatus; responsible?: string; lastVerified?: string }>
  openItems: Record<string, { status?: OpenItemStatus; owner?: string; note?: string }>
}

export interface RecordsResponse extends SharedRecords {
  /** True when the caller is signed out and only public tables are included. */
  restricted: boolean
  /** False where the server cannot persist changes (e.g. a read-only host). */
  writable: boolean
}

export type RecordChange =
  | { kind: "patch"; table: RecordTable; id: string; patch: Record<string, unknown> }
  | { kind: "reset"; table: RecordTable }
  | { kind: "target"; value: "proposed" | "fallback" }

export interface AuditEntry {
  at: string
  user: string
  version: number
  change: RecordChange
}

export function emptyRecords(): SharedRecords {
  return {
    version: 0,
    updatedAt: null,
    updatedBy: null,
    implementationTarget: "proposed",
    actions: {},
    tasks: {},
    decisions: {},
    assumptionReg: {},
    openItems: {},
  }
}
