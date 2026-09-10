import { SectionTabs } from "@/components/dashboard/ui"

const TABS = [
  { href: "/legal/framework", label: "Two-gate framework" },
  { href: "/legal/checker", label: "Instrument checker" },
  { href: "/legal/capacity", label: "Circular 619 capacity" },
  { href: "/legal/b17", label: "B17 simulator" },
  { href: "/legal/assumptions", label: "Assumptions" },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs tabs={TABS} />
      {children}
    </>
  )
}
