import { SectionTabs } from "@/components/dashboard/ui"

const TABS = [
  { href: "/governance/calendar", label: "Monitoring calendar" },
  { href: "/governance/open-items", label: "Open items" },
  { href: "/governance/decisions", label: "Trustee decisions" },
  { href: "/governance/log", label: "Change log" },
]

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs tabs={TABS} />
      {children}
    </>
  )
}
