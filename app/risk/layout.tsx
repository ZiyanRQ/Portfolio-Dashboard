import { SectionTabs } from "@/components/dashboard/ui"

const TABS = [
  { href: "/risk/metrics", label: "Metrics" },
  { href: "/risk/attribution", label: "Alpha / Beta attribution" },
  { href: "/risk/stress", label: "Stress testing" },
  { href: "/risk/scenarios", label: "Scenarios" },
  { href: "/risk/concentration", label: "Concentration" },
  { href: "/risk/exposure", label: "Exposure look-through" },
  { href: "/risk/rates-credit", label: "Rates / Credit" },
  { href: "/risk/liquidity", label: "Liquidity reserve" },
]

export default function RiskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionTabs tabs={TABS} />
      {children}
    </>
  )
}
