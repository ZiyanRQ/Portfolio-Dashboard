import { SectionTabs } from "@/components/dashboard/ui"

const TABS = [
  { href: "/research/explorer", label: "Candidate explorer" },
  { href: "/research/profiles", label: "Fund profiles" },
  { href: "/research/substitution", label: "Substitution tool" },
  { href: "/research/sharia", label: "Sharia analysis" },
]

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs tabs={TABS} />
      {children}
    </>
  )
}
