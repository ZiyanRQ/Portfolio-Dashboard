/**
 * Storage for shared records (server only). Two backends:
 *
 * - Upstash Redis — used whenever KV_REST_API_URL / KV_REST_API_TOKEN are set
 *   (e.g. on Vercel after connecting Upstash in the Storage tab).
 * - Local files — otherwise: data/records.json (replaced atomically) and
 *   data/audit.jsonl (append-only). Set DASHBOARD_DATA_DIR to move them.
 *
 * On a serverless host without Redis, records are read-only.
 */
import { promises as fs } from "node:fs"
import path from "node:path"

import { emptyRecords, type AuditEntry, type RecordChange, type SharedRecords } from "@/lib/data/records"
import { redis, redisConfigured } from "@/lib/server/redis"

export const storageKind: "redis" | "file" | "none" = redisConfigured ? "redis" : process.env.VERCEL ? "none" : "file"
export const storageWritable = storageKind !== "none"

function apply(r: SharedRecords, c: RecordChange): SharedRecords {
  if (c.kind === "target") return { ...r, implementationTarget: c.value }
  if (c.kind === "reset") return { ...r, [c.table]: {} }
  const table = r[c.table] as Record<string, Record<string, unknown>>
  return { ...r, [c.table]: { ...table, [c.id]: { ...table[c.id], ...c.patch } } }
}

function nextRecords(current: SharedRecords, user: string, change: RecordChange): { next: SharedRecords; entry: AuditEntry } {
  const at = new Date().toISOString()
  const next: SharedRecords = { ...apply(current, change), version: current.version + 1, updatedAt: at, updatedBy: user }
  return { next, entry: { at, user, version: next.version, change } }
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

// ─── File backend ─────────────────────────────────────────────────────────

const DATA_DIR = process.env.DASHBOARD_DATA_DIR
  ? path.resolve(process.env.DASHBOARD_DATA_DIR)
  : path.join(process.cwd(), "data")
const RECORDS_FILE = path.join(DATA_DIR, "records.json")
const AUDIT_FILE = path.join(DATA_DIR, "audit.jsonl")

async function fileRead(): Promise<SharedRecords> {
  try {
    const parsed = JSON.parse(await fs.readFile(RECORDS_FILE, "utf8")) as Partial<SharedRecords>
    return { ...emptyRecords(), ...parsed }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyRecords()
    throw e
  }
}

async function replaceFile(tmp: string, target: string) {
  // Windows can briefly lock the target (antivirus, indexer); retry a few times.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, target)
      return
    } catch (e) {
      if (attempt >= 5) throw e
      await sleep(50 * (attempt + 1))
    }
  }
}

// Serialise writes within this server process so concurrent saves never interleave.
const lockHolder = globalThis as unknown as { __recordsLock?: Promise<unknown> }

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = (lockHolder.__recordsLock ?? Promise.resolve()).then(fn, fn)
  lockHolder.__recordsLock = run.catch(() => undefined)
  return run
}

function fileApply(user: string, change: RecordChange): Promise<SharedRecords> {
  return withLock(async () => {
    const { next, entry } = nextRecords(await fileRead(), user, change)
    await fs.mkdir(DATA_DIR, { recursive: true })
    const tmp = `${RECORDS_FILE}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8")
    await replaceFile(tmp, RECORDS_FILE)
    await fs.appendFile(AUDIT_FILE, `${JSON.stringify(entry)}\n`, "utf8")
    return next
  })
}

async function fileAudit(limit: number): Promise<AuditEntry[]> {
  try {
    const lines = (await fs.readFile(AUDIT_FILE, "utf8")).split("\n").filter(Boolean)
    return lines.slice(-limit).reverse().flatMap(parseEntry)
  } catch {
    return []
  }
}

// ─── Redis backend ────────────────────────────────────────────────────────

const RECORDS_KEY = "tpa:records"
const VERSION_KEY = "tpa:records:version"
const AUDIT_KEY = "tpa:audit"
const AUDIT_CAP = 5000

// Compare-and-set: write only if nobody else saved since we read. Keeps the
// record, its version and the audit entry in one atomic step.
const CAS_SCRIPT = `
local v = tonumber(redis.call('GET', KEYS[2]) or '0')
if v ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[3])
redis.call('LPUSH', KEYS[3], ARGV[4])
redis.call('LTRIM', KEYS[3], 0, ${AUDIT_CAP - 1})
return 1`

async function redisRead(): Promise<SharedRecords> {
  const raw = await redis<string | null>("GET", RECORDS_KEY)
  return raw ? { ...emptyRecords(), ...(JSON.parse(raw) as Partial<SharedRecords>) } : emptyRecords()
}

async function redisApply(user: string, change: RecordChange): Promise<SharedRecords> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await redisRead()
    const { next, entry } = nextRecords(current, user, change)
    const saved = await redis<number>(
      "EVAL",
      CAS_SCRIPT,
      3,
      RECORDS_KEY,
      VERSION_KEY,
      AUDIT_KEY,
      current.version,
      JSON.stringify(next),
      next.version,
      JSON.stringify(entry)
    )
    if (Number(saved) === 1) return next
    await sleep(40 * (attempt + 1))
  }
  throw new Error("Too many simultaneous edits — try again")
}

async function redisAudit(limit: number): Promise<AuditEntry[]> {
  const rows = await redis<string[]>("LRANGE", AUDIT_KEY, 0, limit - 1)
  return (rows ?? []).flatMap(parseEntry)
}

// ─── Public API ───────────────────────────────────────────────────────────

function parseEntry(line: string): AuditEntry[] {
  try {
    return [JSON.parse(line) as AuditEntry]
  } catch {
    return []
  }
}

export function readRecords(): Promise<SharedRecords> {
  return storageKind === "redis" ? redisRead() : fileRead()
}

export function applyChange(user: string, change: RecordChange): Promise<SharedRecords> {
  return storageKind === "redis" ? redisApply(user, change) : fileApply(user, change)
}

export async function readAudit(limit: number): Promise<AuditEntry[]> {
  return storageKind === "redis" ? redisAudit(limit) : fileAudit(limit)
}
