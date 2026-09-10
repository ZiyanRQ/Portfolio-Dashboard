"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { INSTRUMENTS, type GateResult, type Instrument } from "@/lib/data/legal"
import { cn } from "@/lib/utils"
import { Callout, PageHeader, Panel, StatusPill, type Tone } from "@/components/dashboard/ui"

const RESULT: Record<GateResult, { label: string; tone: Tone }> = {
  pass: { label: "Pass", tone: "green" },
  conditional: { label: "Conditional pass", tone: "amber" },
  fail: { label: "Fail", tone: "red" },
  excluded: { label: "Excluded (prudence)", tone: "red" },
  confirm: { label: "Requires confirmation", tone: "amber" },
}

function verdict(i: Instrument): { label: string; tone: Tone } {
  if (i.gate1 === "pass" && i.gate2 === "pass") return { label: "Investable", tone: "green" }
  if (i.gate1 === "fail" || i.gate2 === "fail" || i.gate1 === "excluded") return { label: "Not investable", tone: "red" }
  return { label: "Investable only if the condition is met", tone: "amber" }
}

function InstrumentCard({ i }: { i: Instrument }) {
  const v = verdict(i)
  return (
    <Panel
      title={i.name}
      actions={<StatusPill tone={v.tone}>{v.label}</StatusPill>}
      bodyClassName="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">Gate 1 · MPT Act / Circular 619</span>
            <StatusPill tone={RESULT[i.gate1].tone}>{RESULT[i.gate1].label}</StatusPill>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">{i.gate1Basis}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">Gate 2 · s.11(5) / Rule 17C</span>
            <StatusPill tone={RESULT[i.gate2].tone}>{RESULT[i.gate2].label}</StatusPill>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">{i.gate2Basis}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Regulatory tier</dt>
          <dd className="font-medium text-slate-900">{i.tier}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Consumes Circular 619 capacity?</dt>
          <dd className="font-medium text-slate-900">
            {i.consumesCapacity === null ? (i.tier === "Not investable" ? "n/a — not investable" : "Requires confirmation") : i.consumesCapacity ? "Yes" : "No"}
          </dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-slate-600">{i.note}</p>
    </Panel>
  )
}

export default function CheckerPage() {
  const [selected, setSelected] = useState<string[]>(["equity-mf", "direct-gsec", "gilt-mf"])
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const groups = ["Requested", "Additional traps"] as const

  return (
    <>
      <PageHeader
        eyebrow="Legal & Compliance · Instrument checker"
        title="Can the trust hold it?"
        description="Select one or more instruments to see each gate's result, the regulatory tier, whether it uses Circular 619 capacity, and the legal basis."
      />

      <Panel>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{g === "Requested" ? "Common instruments" : "Traps between the two gates"}</div>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENTS.filter((i) => i.group === g).map((i) => {
                  const on = selected.includes(i.id)
                  const v = verdict(i)
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggle(i.id)}
                      aria-pressed={on}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                      )}
                    >
                      {on ? <Check className="size-3" /> : <span className={cn("size-1.5 rounded-full", v.tone === "green" ? "bg-emerald-500" : v.tone === "amber" ? "bg-amber-400" : "bg-red-500")} />}
                      {i.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-blue-700 hover:underline" onClick={() => setSelected(INSTRUMENTS.map((i) => i.id))}>
              Select all
            </button>
            <span className="text-slate-300">·</span>
            <button type="button" className="text-blue-700 hover:underline" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        </div>
      </Panel>

      {selected.length === 0 ? (
        <Callout tone="neutral">Select an instrument above.</Callout>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {INSTRUMENTS.filter((i) => selected.includes(i.id)).map((i) => (
            <InstrumentCard key={i.id} i={i} />
          ))}
        </div>
      )}

      <Callout tone="neutral">
        Headline finding (§9): legality narrowed the 22-fund research universe by nothing — every candidate scores Legal
        Compliance 10. Selection is about suitability, not permission. Legal research, not legal advice.
      </Callout>
    </>
  )
}
