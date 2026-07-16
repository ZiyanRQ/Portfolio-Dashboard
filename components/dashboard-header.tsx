"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export function DashboardHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <SidebarTrigger className="text-slate-600 hover:text-slate-900" />
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">
        Trust Portfolio Analytics
      </h1>
      <div className="ml-auto">
        <div className="flex h-9 w-36 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          Currency selector
        </div>
      </div>
    </header>
  )
}
