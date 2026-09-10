"use client"

import Link from "next/link"
import { Popover } from "@base-ui/react/popover"
import { ChevronDown, LogIn, LogOut, RefreshCw, UserRound } from "lucide-react"

import { useAuth } from "@/lib/auth-client"
import { PORTFOLIO_VALUE } from "@/lib/data/portfolio"
import { CURRENCIES, fmtDate, todayISO, type Currency } from "@/lib/format"
import { useDashboard } from "@/lib/store"
import { cn } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NumberField, Segmented } from "@/components/dashboard/ui"

function FxPopover() {
  const { state, set, rateInfo, rates, refreshFx } = useDashboard()
  const live = state.liveRates
  const code = state.currency === "INR" ? "GBP" : state.currency

  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none">
        <span className={cn("size-1.5 rounded-full", rateInfo.mode === "live" ? "bg-emerald-500" : "bg-slate-400")} />
        <span className="hidden tabular-nums lg:inline">
          1 {code} = ₹{rates[code].toFixed(2)}
        </span>
        <span className="lg:hidden">FX</span>
        <span className="hidden text-slate-400 xl:inline">
          · {rateInfo.mode === "live" ? "Live" : "Fixed"} · {fmtDate(rateInfo.asOf)}
        </span>
        <ChevronDown className="size-3.5 text-slate-400" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-80 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg outline-none">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Exchange rate</span>
              <Segmented
                size="xs"
                ariaLabel="Rate mode"
                value={state.fxMode}
                onChange={(v) => set({ fxMode: v })}
                options={[
                  { value: "fixed", label: "Fixed presentation" },
                  { value: "live", label: "Live" },
                ]}
              />
            </div>
            <p className="text-xs text-slate-500">
              All figures are held in INR and converted for display. The fixed presentation rate keeps trustee packs
              reproducible; the live rate follows the latest published reference rate.
            </p>

            <div className={cn("space-y-1.5 rounded-md border p-2.5", state.fxMode === "live" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200")}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Live rate</span>
                <button
                  type="button"
                  onClick={refreshFx}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
                >
                  <RefreshCw className={cn("size-3", state.fxStatus === "loading" && "animate-spin")} /> Refresh
                </button>
              </div>
              {live ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                    <span>1 GBP = ₹{live.GBP.toFixed(2)}</span>
                    <span>1 USD = ₹{live.USD.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {live.source} · rate date {fmtDate(live.asOf)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">
                  {state.fxStatus === "error" ? "Live rate unavailable (offline or blocked)." : "Fetching…"}
                </div>
              )}
            </div>

            <div className={cn("space-y-2 rounded-md border p-2.5", state.fxMode === "fixed" ? "border-blue-200 bg-blue-50/40" : "border-slate-200")}>
              <span className="text-xs font-semibold text-slate-700">Fixed presentation rate</span>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="₹ per GBP"
                  value={state.fixedRates.GBP}
                  step={0.01}
                  onChange={(v) =>
                    v > 0 && set({ fixedRates: { ...state.fixedRates, GBP: v, asOf: todayISO(), source: "Manual presentation rate" } })
                  }
                />
                <NumberField
                  label="₹ per USD"
                  value={state.fixedRates.USD}
                  step={0.01}
                  onChange={(v) =>
                    v > 0 && set({ fixedRates: { ...state.fixedRates, USD: v, asOf: todayISO(), source: "Manual presentation rate" } })
                  }
                />
              </div>
              <div className="text-[11px] text-slate-500">
                {state.fixedRates.source}
                {state.fixedRates.asOf && ` · ${fmtDate(state.fixedRates.asOf)}`}
              </div>
              {live && (
                <button
                  type="button"
                  onClick={() =>
                    set({
                      fixedRates: {
                        GBP: Number(live.GBP.toFixed(2)),
                        USD: Number(live.USD.toFixed(2)),
                        asOf: live.asOf,
                        source: `Locked from ${live.source}`,
                      },
                    })
                  }
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Lock today&apos;s live rate as the presentation rate
                </button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function AuthControl() {
  const { user, loading, signOut } = useAuth()
  if (loading) return null
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <LogIn className="size-3.5" /> Sign in
      </Link>
    )
  }
  return (
    <div className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white pl-2 text-xs text-slate-700">
      <UserRound className="size-3.5 text-slate-400" />
      <span className="max-w-24 truncate font-medium">{user}</span>
      <button
        type="button"
        onClick={() => signOut()}
        title="Sign out"
        className="ml-1 inline-flex h-full items-center gap-1 border-l border-slate-200 px-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      >
        <LogOut className="size-3.5" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  )
}

export function DashboardHeader() {
  const { state, set, money } = useDashboard()
  const { identity, identityRevealed } = useAuth()
  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur md:px-6">
      <SidebarTrigger className="text-slate-600 hover:text-slate-900" />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-slate-900">{identity.name}</div>
        <div className="hidden truncate text-xs text-slate-500 sm:block">
          {identityRevealed ? identity.reference : "Identifying details hidden — sign in to view"} · Securities portfolio ·{" "}
          {money(PORTFOLIO_VALUE)} · Draft for trustee review, Sept 2026
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Segmented<Currency>
          ariaLabel="Currency"
          value={state.currency}
          onChange={(v) => set({ currency: v })}
          options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
        />
        <FxPopover />
        <AuthControl />
      </div>
    </header>
  )
}
