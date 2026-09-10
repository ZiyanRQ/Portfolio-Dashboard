"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import { FUNDS, getFund } from "@/lib/data/funds"
import { SLEEVE_COLORS } from "@/lib/colors"
import { cn } from "@/lib/utils"
import { FundProfile } from "@/components/dashboard/fund-sheet"
import { PageHeader, Panel, Swatch } from "@/components/dashboard/ui"

const GROUPS = [
  { key: "selected", label: "In the proposal" },
  { key: "bench", label: "Bench / shortlisted" },
  { key: "rejected", label: "Not recommended" },
  { key: "exit", label: "Current holding — exit" },
  { key: "instrument", label: "Direct base-tier instruments" },
] as const

export default function ProfilesPage() {
  const [selected, setSelected] = useState("ppfas-flexi")
  const [query, setQuery] = useState("")
  const fund = getFund(selected)
  const list = FUNDS.filter((f) => f.id !== "cash-pending" && f.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <PageHeader
        eyebrow="Fund Research · Profiles"
        title="Fund profiles"
        description="Everything the proposal records about each fund: performance, risk, Phase 3 scores, legal classification, role and monitoring."
      />
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel bodyClassName="p-2">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 px-2">
            <Search className="size-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search funds"
              className="h-8 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto">
            {GROUPS.map((g) => {
              const items = list.filter((f) => f.researchStatus === g.key)
              if (!items.length) return null
              return (
                <div key={g.key}>
                  <div className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{g.label}</div>
                  {items.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelected(f.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        f.id === selected ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Swatch color={SLEEVE_COLORS[f.sleeve]} />
                      <span className="min-w-0 flex-1 truncate">{f.shortName}</span>
                      <span className={cn("text-xs tabular-nums", f.id === selected ? "text-slate-300" : "text-slate-400")}>
                        {f.phase3Score?.toFixed(1) ?? "—"}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </Panel>
        <Panel title={fund.name} description={`${fund.category} · ${fund.amc}`}>
          <FundProfile fund={fund} />
        </Panel>
      </div>
    </>
  )
}
