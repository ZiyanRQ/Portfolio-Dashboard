import { SectionTabs } from "@/components/dashboard/ui"

const TABS = [
  { href: "/implementation/plan", label: "Transition plan" },
  { href: "/implementation/trades", label: "Trades" },
  { href: "/implementation/progress", label: "Progress" },
]

export default function ImplementationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs tabs={TABS} />
      {children}
    </>
  )
}
