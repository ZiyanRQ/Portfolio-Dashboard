"use client"

import { AuthProvider } from "@/lib/auth-client"
import { DashboardProvider } from "@/lib/store"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { FundSheet } from "@/components/dashboard/fund-sheet"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
    <DashboardProvider>
      <SidebarProvider>
        <TooltipProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 bg-slate-50">
            <DashboardHeader />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">{children}</div>
          </SidebarInset>
          <FundSheet />
        </TooltipProvider>
      </SidebarProvider>
    </DashboardProvider>
    </AuthProvider>
  )
}
