"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

import { MONITORING_TASKS, TRUSTEE_DECISIONS } from "@/lib/data/governance"
import { ASSUMPTIONS, OPEN_ITEMS } from "@/lib/data/legal"
import type { AuditEntry, RecordTable } from "@/lib/data/records"
import { fmtDateTime } from "@/lib/format"
import { useAuth } from "@/lib/auth-client"
import { fillIdentity } from "@/lib/identity"
import { useDashboard } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Callout, PageHeader, Panel, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const TABLE_LABEL: Record<RecordTable, string> = {
  actions: "Trade",
  tasks: "Monitoring task",
  decisions: "Trustee decision",
  assumptionReg: "Assumption",
  openItems: "Open item",
}

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  date: "Completion date",
  owner: "Owner",
  notes: "Notes",
  note: "Note",
  lastCompleted: "Last completed",
  nextDue: "Next due",
  responsible: "Responsible",
  lastVerified: "Last verified",
}

export default function ChangeLogPage() {
  const { model } = useDashboard()
  const { identity } = useAuth()
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch("/api/records/audit?limit=200", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<{ entries: AuditEntry[] }>
      })
      .then((j) => {
        setEntries(j.entries)
        setError(null)
      })
      .catch(() => setError("Could not load the change log."))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const describe = (e: AuditEntry) => {
    const c = e.change
    if (c.kind === "target") {
      return { record: "Implementation target", detail: c.value === "fallback" ? "Compliance fallback" : "Core Growth 70/30 (proposed)" }
    }
    if (c.kind === "reset") return { record: `${TABLE_LABEL[c.table]}s`, detail: "Cleared all entries" }
    const name =
      c.table === "tasks"
        ? MONITORING_TASKS.find((t) => t.id === c.id)?.title
        : c.table === "decisions"
          ? TRUSTEE_DECISIONS.find((d) => d.id === c.id)?.title
          : c.table === "openItems"
            ? `${c.id} · ${OPEN_ITEMS.find((o) => o.id === c.id)?.issue ?? ""}`
            : c.table === "assumptionReg"
              ? `${c.id} · ${fillIdentity(ASSUMPTIONS.find((a) => a.id === c.id)?.text ?? "", identity)}`
              : model.actions.find((a) => a.id === c.id)?.title
    return {
      record: `${TABLE_LABEL[c.table]} — ${name ?? c.id}`,
      detail: Object.entries(c.patch)
        .map(([k, v]) => `${FIELD_LABEL[k] ?? k}: ${v === "" || v === null ? "—" : String(v)}`)
        .join(" · "),
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Governance · Change log"
        title="Change log"
        description="Every change to the shared records — who made it and when. The log is append-only and kept on the server alongside the records."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}

      <Panel>
        {entries === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">No changes recorded yet.</p>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Record</Th>
                <Th>Change</Th>
                <Th align="right">Version</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const d = describe(e)
                return (
                  <tr key={`${e.version}-${e.at}`}>
                    <Td className="text-xs whitespace-nowrap text-slate-600">{fmtDateTime(e.at)}</Td>
                    <Td>
                      <StatusPill tone="neutral" icon={false}>
                        {e.user}
                      </StatusPill>
                    </Td>
                    <Td className="max-w-80 whitespace-normal text-slate-800">{d.record}</Td>
                    <Td className="max-w-96 text-xs whitespace-normal text-slate-600">{d.detail}</Td>
                    <Td align="right" className="text-xs text-slate-400">
                      v{e.version}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  )
}
