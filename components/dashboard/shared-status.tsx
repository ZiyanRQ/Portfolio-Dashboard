"use client"

import Link from "next/link"
import { AlertTriangle, CloudCheck, Loader2, Lock, RefreshCw } from "lucide-react"

import { fmtDateTime } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { cn } from "@/lib/utils"

/** Save / sync state of the shared records, shown on every page that edits them. */
export function SharedStatus({ className }: { className?: string }) {
  const { state, canEditRecords, reloadRecords } = useDashboard()
  const r = state.records
  const base = "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs"

  if (r.status === "loading") {
    return (
      <span className={cn(base, "border-slate-200 bg-white text-slate-500", className)}>
        <Loader2 className="size-3.5 animate-spin" /> Loading shared records…
      </span>
    )
  }
  if (r.status === "error") {
    return (
      <span className={cn(base, "border-red-200 bg-red-50 text-red-800", className)} title={r.error ?? undefined}>
        <AlertTriangle className="size-3.5" />
        <span className="max-w-64 truncate">{r.error}</span>
        <button type="button" onClick={reloadRecords} className="ml-1 inline-flex items-center gap-1 font-medium underline">
          <RefreshCw className="size-3" /> Retry
        </button>
      </span>
    )
  }
  if (!canEditRecords) {
    return (
      <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-600", className)}>
        <Lock className="size-3.5" />
        {r.writable ? (
          <>
            Read-only ·{" "}
            <Link href="/login" className="font-medium underline">
              sign in to edit
            </Link>
          </>
        ) : (
          "Read-only — this host cannot save shared records"
        )}
      </span>
    )
  }
  return (
    <span
      className={cn(base, "border-emerald-200 bg-emerald-50 text-emerald-900", className)}
      title="Saved on the server and visible to every signed-in user"
    >
      {r.status === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : <CloudCheck className="size-3.5" />}
      {r.status === "saving"
        ? "Saving…"
        : r.updatedAt
          ? `Shared · last change by ${r.updatedBy ?? "—"}, ${fmtDateTime(r.updatedAt)}`
          : "Shared · no changes yet"}
    </span>
  )
}
