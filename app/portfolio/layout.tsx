import { SectionTabs } from "@/components/dashboard/ui"

const TABS = [
  { href: "/portfolio/current", label: "Current" },
  { href: "/portfolio/proposed", label: "Proposed" },
  { href: "/portfolio/builder", label: "Builder" },
  { href: "/portfolio/comparison", label: "Comparison" },
  { href: "/portfolio/costs", label: "Fee saving" },
]

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs tabs={TABS} />
      {children}
    </>
  )
}
