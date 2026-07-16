"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BookOpen,
  GitCompare,
  Layers,
  LayoutDashboard,
  PieChart,
  Shield,
  Wallet,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Executive Summary", href: "/", icon: LayoutDashboard },
  { title: "Current Portfolio", href: "/current-portfolio", icon: PieChart },
  { title: "Proposed Portfolio", href: "/proposed-portfolio", icon: Layers },
  { title: "Comparison", href: "/comparison", icon: GitCompare },
  { title: "Liquidity", href: "/liquidity", icon: Wallet },
  { title: "Stress Testing", href: "/stress-testing", icon: Activity },
  { title: "Governance", href: "/governance", icon: Shield },
  { title: "Research Library", href: "/research-library", icon: BookOpen },
] as const

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <span className="truncate text-sm font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          Trust Portfolio Analytics
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
