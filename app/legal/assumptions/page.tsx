"use client"

import { useState } from "react"

import { ASSUMPTIONS, CONCLUSIONS, type AssumptionStatus, type Priority } from "@/lib/data/legal"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-client"
import { fillIdentity } from "@/lib/identity"
import { useDashboard } from "@/lib/store"
import { Callout, PageHeader, Panel, Segmented, StatusPill, TableWrap, Td, Th, type Tone } from "@/components/dashboard/ui"
import { SharedStatus } from "@/components/dashboard/shared-status"

const STATUSES: AssumptionStatus[] = ["Adopted", "Confirmed", "Unconfirmed", "Open item", "Trustee decision"]
const PRIORITY_TONE: Record<Priority, Tone> = { Critical: "red", High: "amber", Medium: "blue", Low: "neutral" }
const STATUS_TONE: Record<AssumptionStatus, Tone> = {
  Adopted: "neutral",
  Confirmed: "green",
  Unconfirmed: "red",
  "Open item": "amber",
  "Trustee decision": "blue",
}

function DependencyDiagram() {
  const { identity } = useAuth()
  const [focus, setFocus] = useState<string | null>(null)
  const rowH = 26
  const left = ASSUMPTIONS.map((a, i) => ({ id: a.id, label: `${a.id} · ${fillIdentity(a.text, identity)}`, y: 20 + i * rowH, critical: a.id === "B17" }))
  const rightGap = (ASSUMPTIONS.length * rowH) / CONCLUSIONS.length
  const right = CONCLUSIONS.map((c, i) => ({ ...c, y: 20 + i * rightGap + rightGap / 2 - rowH / 2 }))
  const height = 20 + ASSUMPTIONS.length * rowH + 10
  const lx = 300
  const rx = 470
  const links = right.flatMap((c) => c.deps.map((d) => ({ from: d, to: c.id })))
  const active = (from: string, to: string) => focus === null || focus === from || focus === to

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 820 ${height}`} className="w-full min-w-[760px]" role="img" aria-label="Assumption dependency diagram">
        {links.map((l) => {
          const a = left.find((n) => n.id === l.from)
          const c = right.find((n) => n.id === l.to)
          if (!a || !c) return null
          const y1 = a.y + 10
          const y2 = c.y + 10
          const crit = l.from === "B17"
          return (
            <path
              key={`${l.from}-${l.to}`}
              d={`M ${lx} ${y1} C ${lx + 80} ${y1}, ${rx - 80} ${y2}, ${rx} ${y2}`}
              fill="none"
              stroke={crit ? "#d03b3b" : "#94a3b8"}
              strokeWidth={crit ? 2 : 1}
              opacity={active(l.from, l.to) ? (crit ? 0.9 : 0.6) : 0.08}
            />
          )
        })}
        {left.map((n) => (
          <g key={n.id} onMouseEnter={() => setFocus(n.id)} onMouseLeave={() => setFocus(null)} className="cursor-default">
            <rect
              x={4}
              y={n.y}
              width={lx - 4}
              height={20}
              rx={4}
              fill={n.critical ? "#fef2f2" : "#f8fafc"}
              stroke={n.critical ? "#d03b3b" : focus === n.id ? "#0f172a" : "#e2e8f0"}
              strokeWidth={n.critical ? 1.5 : 1}
            />
            <text x={12} y={n.y + 14} className={cn("text-[10.5px]", n.critical ? "fill-red-800 font-semibold" : "fill-slate-700")}>
              {n.label.length > 46 ? `${n.label.slice(0, 45)}…` : n.label}
              <title>{n.label}</title>
            </text>
          </g>
        ))}
        {right.map((c) => (
          <g key={c.id} onMouseEnter={() => setFocus(c.id)} onMouseLeave={() => setFocus(null)}>
            <rect
              x={rx}
              y={c.y}
              width={340}
              height={20}
              rx={4}
              fill={"critical" in c && c.critical ? "#fef2f2" : "#eff6ff"}
              stroke={"critical" in c && c.critical ? "#d03b3b" : focus === c.id ? "#0f172a" : "#bfdbfe"}
            />
            <text x={rx + 8} y={c.y + 14} className="fill-slate-800 text-[10.5px]">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-xs text-slate-500">
        Hover an assumption or conclusion to isolate its links. Red: B17 — the critical dependency that can change the
        compliant portfolio structure.
      </p>
    </div>
  )
}

export default function AssumptionsPage() {
  const { state, setRecord, canEditRecords: canEdit } = useDashboard()
  const { identity } = useAuth()
  const [filter, setFilter] = useState<"all" | "open" | "critical">("all")
  const rows = ASSUMPTIONS.filter((a) => {
    const status = state.assumptionReg[a.id]?.status ?? a.status
    if (filter === "open") return status !== "Confirmed" && status !== "Adopted"
    if (filter === "critical") return a.priority === "Critical" || a.priority === "High"
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow="Legal & Compliance · Assumptions"
        title="Assumption register (B1–B17)"
        description="Assumptions fill gaps in the record and are reversible if the underlying fact turns out otherwise. None is presented as law. Status, owner and verification date are shared with every signed-in user."
        actions={
          <>
          <SharedStatus />
          <Segmented
            ariaLabel="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Not yet confirmed" },
              { value: "critical", label: "Critical / high" },
            ]}
          />
          </>
        }
      />

      <Callout tone="red" title="B17 is the critical dependency">
        Whether the Core Growth 70/30 may sit 100% in mutual funds turns on B17 alone. Confirming it is open item O2.
      </Callout>

      {!canEdit && (
        <Callout tone="neutral" title="Read-only">
          Sign in to update statuses, owners and verification dates.{" "}
          <a href="/login?next=/legal/assumptions" className="font-medium underline">
            Sign in
          </a>
        </Callout>
      )}

      <Panel title="Register">
        <TableWrap>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Assumption</Th>
              <Th>Status</Th>
              <Th>Evidence</Th>
              <Th>Impact</Th>
              <Th>Priority</Th>
              <Th>Confidence</Th>
              <Th>Responsible</Th>
              <Th>Last verified</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const rec = state.assumptionReg[a.id] ?? {}
              const status = rec.status ?? a.status
              const critical = a.id === "B17"
              return (
                <tr key={a.id} className={critical ? "bg-red-50/60" : undefined}>
                  <Td className={cn("font-mono text-xs font-semibold", critical ? "text-red-800" : "text-slate-800")}>
                    {a.id}
                    {a.openItem && <div className="font-sans text-[10px] font-normal text-slate-500">{a.openItem}</div>}
                  </Td>
                  <Td className="max-w-72 whitespace-normal">
                    <div className="text-slate-800">{fillIdentity(a.text, identity)}</div>
                    <div className="text-[11px] text-slate-500">{a.direction}</div>
                  </Td>
                  <Td>
                    <select
                      aria-label={`${a.id} status`}
                      value={status}
                      disabled={!canEdit}
                      onChange={(e) => setRecord("assumptionReg", a.id, { status: e.target.value })}
                      className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <div className="mt-1">
                      <StatusPill tone={STATUS_TONE[status]} icon={false} className="text-[10px]">
                        {status}
                      </StatusPill>
                    </div>
                  </Td>
                  <Td className="max-w-56 text-xs whitespace-normal text-slate-600">{fillIdentity(a.evidence, identity)}</Td>
                  <Td className="max-w-56 text-xs whitespace-normal text-slate-600">{a.impact}</Td>
                  <Td>
                    <StatusPill tone={PRIORITY_TONE[a.priority]} icon={false}>
                      {a.priority}
                    </StatusPill>
                  </Td>
                  <Td className="text-xs">{a.confidence}</Td>
                  <Td>
                    <input
                      aria-label={`${a.id} responsible`}
                      value={rec.responsible ?? ""}
                      placeholder="To be assigned"
                      disabled={!canEdit}
                      onChange={(e) => setRecord("assumptionReg", a.id, { responsible: e.target.value })}
                      className="h-7 w-32 rounded-md border border-slate-200 px-1.5 text-xs placeholder:text-slate-400"
                    />
                  </Td>
                  <Td>
                    <input
                      type="date"
                      aria-label={`${a.id} last verified`}
                      value={rec.lastVerified ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => setRecord("assumptionReg", a.id, { lastVerified: e.target.value })}
                      className="h-7 rounded-md border border-slate-200 px-1.5 text-xs"
                    />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
      </Panel>

      <Panel title="Assumption dependency diagram" description="Which portfolio conclusions rest on which assumptions">
        <DependencyDiagram />
      </Panel>
    </>
  )
}
