"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  Lock,
  PieChart,
  Scale,
  Search,
} from "lucide-react"

import { PROTECTED_PREFIXES, useAuth } from "@/lib/auth-client"
import { useDashboard } from "@/lib/store"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Portfolio", href: "/portfolio", icon: PieChart },
  { title: "Risk & Performance", href: "/risk", icon: Activity },
  { title: "Legal & Compliance", href: "/legal", icon: Scale },
  { title: "Fund Research", href: "/research", icon: Search },
  { title: "Implementation", href: "/implementation", icon: ListChecks },
  { title: "Governance", href: "/governance", icon: ClipboardCheck },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const { resetAll } = useDashboard()
  const { user, loading } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
            TP
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">Trust Portfolio Analytics</div>
            <div className="truncate text-[11px] text-slate-500">Trustee decision support</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                const locked = !loading && !user && PROTECTED_PREFIXES.includes(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={locked ? `${item.title} — sign in required` : item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      {locked && <Lock className="ml-auto size-3.5 text-slate-400 group-data-[collapsible=icon]:hidden" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:hidden">
        <p className="text-[11px] leading-snug text-slate-500">
          Source: Investment &amp; Portfolio Restructuring Proposal (Sept 2026). Illustrative analysis — not legal, tax or
          investment advice.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Reset this browser's inputs (builder, simulators, currency view) to the proposal defaults? Shared records are not affected."))
              resetAll()
          }}
          className="mt-1 text-left text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:underline"
        >
          Reset all dashboard inputs
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
