"use client"

import { BREACH_CONSEQUENCES, C619_CATEGORIES } from "@/lib/data/legal"
import { Callout, PageHeader, Panel, StatusPill, TableWrap, Td, Th } from "@/components/dashboard/ui"

const GATE1 = "#2a78d6"
const GATE2 = "#eb6834"

const REGIONS = [
  {
    key: "g1",
    title: "Gate 1 only",
    sub: "Allowed by the Circular, but fails tax law or is excluded on prudence",
    cls: "border-blue-200 bg-blue-50/50",
    items: [
      "Direct non-PSU listed shares — clause (g)",
      "Private corporate bonds — clause (d)",
      "Basel III AT1 bonds — clause (e), prudence",
      "Infrastructure debt / IDF units — clause (f)",
    ],
  },
  {
    key: "both",
    title: "Both gates — investable",
    sub: "The only instruments the trust may hold",
    cls: "border-emerald-300 bg-emerald-50/60",
    items: [
      "Equity mutual funds — clause (h)",
      "Debt mutual funds — clause (c)",
      "Nifty 50 / Sensex 30 index funds & ETFs — clause (i)",
      "Direct G-Secs, T-Bills, SDLs",
      "Scheduled-bank deposits",
      "Government-guaranteed securities",
      "PSU shares, market cap ≥ ₹5,000 cr",
    ],
  },
  {
    key: "g2",
    title: "Gate 2 only",
    sub: "Allowed by tax law, but not by the Circular",
    cls: "border-orange-200 bg-orange-50/50",
    items: ["Balanced-advantage / hybrid / multi-asset funds", "Immovable property — permission route, s.11(5)(x)"],
  },
]

function TwoGateDiagram() {
  const label = (x: number, title: string, sub: string, cls = "fill-slate-800") => (
    <>
      <text x={x} y={86} textAnchor="middle" className={`${cls} text-[12px] font-semibold`}>
        {title}
      </text>
      <text x={x} y={101} textAnchor="middle" className="fill-slate-500 text-[10px]">
        {sub}
      </text>
    </>
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        <svg viewBox="0 0 360 176" className="w-full max-w-sm" role="img" aria-label="Gate 1 and Gate 2 drawn as overlapping circles; investable instruments sit in the overlap">
          <circle cx={140} cy={88} r={80} fill={GATE1} fillOpacity={0.1} stroke={GATE1} strokeWidth={1.5} />
          <circle cx={220} cy={88} r={80} fill={GATE2} fillOpacity={0.1} stroke={GATE2} strokeWidth={1.5} />
          {label(98, "Gate 1", "only")}
          {label(180, "Investable", "both gates", "fill-emerald-800")}
          {label(262, "Gate 2", "only")}
        </svg>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border" style={{ borderColor: GATE1, background: `${GATE1}33` }} />
            Gate 1 — Maharashtra law: MPT Act s.35 + Circular 619
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border" style={{ borderColor: GATE2, background: `${GATE2}33` }} />
            Gate 2 — Tax law: Income-tax Act s.11(5) + Rule 17C
          </span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {REGIONS.map((r) => (
          <div key={r.key} className={`rounded-lg border p-3.5 ${r.cls}`}>
            <div className="text-sm font-semibold text-slate-900">{r.title}</div>
            <div className="text-xs text-slate-500">{r.sub}</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {r.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">
        Outside both gates: gold/silver ETFs, international FoFs, AIFs, PMS, derivatives, NSC/PPF/KVP. Figure 1 — an instrument is
        investable only where the two gates overlap; neither list is a subset of the other.
      </p>
    </div>
  )
}

export default function FrameworkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal & Compliance · Two-gate framework"
        title="The same rupee is regulated twice"
        description="The Society's surplus is governed by the Maharashtra Public Trusts Act (state law) and by Section 11(5) of the Income-tax Act (tax law). An instrument is investable only if it clears both gates."
      />

      <Panel>
        <TwoGateDiagram />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Gate 1 — Maharashtra law" description="MPT Act 1950 s.35; Circular 619 (21 July 2025)">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              <strong>s.35 base position:</strong> trust money that cannot be applied immediately must be deposited in a
              Scheduled Bank, Postal Savings Bank or State-approved Co-operative Bank, or invested in “public securities”
              (s.2(12)). <strong>There is no ceiling on this base tier</strong> — a trust could hold 100% there.
            </li>
            <li>
              <strong>Second proviso:</strong> the Charity Commissioner may permit investment “in any other manner”.
              Circular 619 is that general order — it permits up to <strong>50% of trust money</strong> in nine categories
              drawn verbatim from MoF Notification S.O. 1267(E) (21 April 2017).
            </li>
          </ul>
          <Callout tone="blue" className="mt-3" title="Where the cap lives">
            The 50% cap belongs to Gate 1 (Circular 619). It is not a general cap on all trust investments, and it does not
            come from tax law.
          </Callout>
        </Panel>

        <Panel title="Gate 2 — Tax law" description="Income-tax Act s.11(5); Rule 17C">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              s.11(5) and Rule 17C list the permitted “forms and modes”. A breach costs exemption on the offending income
              under s.13(1)(d), taxed at 30% under s.115BBI.
            </li>
            <li>
              <strong>Rule 17C(i)</strong> permits units of any scheme of a s.10(23D) mutual fund — equity, index and debt
              funds alike. (Both source documents wrongly stated that tax law permits only debt funds.)
            </li>
            <li>
              <strong>s.11(5)(vii)</strong> permits shares of public-sector companies only — why direct non-PSU equity is
              closed.
            </li>
            <li>Gate 2 imposes <strong>no percentage limit</strong>; it is a yes/no eligibility test.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="How the 50% cap is read (B3)" description="Circular 619 is silent on three questions; the most restrictive reading is adopted">
        <TableWrap>
          <thead>
            <tr>
              <Th>Open question</Th>
              <Th>Conservative reading adopted</Th>
              <Th>Effect</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Collective across clauses (a)–(i), or per category?</Td>
              <Td>Collective — one 50% limit over the whole list</Td>
              <Td>Tightest ceiling</Td>
            </tr>
            <tr>
              <Td>Measured at cost or market value?</Td>
              <Td>Market value</Td>
              <Td>A rally can create a breach</Td>
            </tr>
            <tr>
              <Td>Tested at purchase or continuously?</Td>
              <Td>Continuously</Td>
              <Td>Needs an ongoing buffer</Td>
            </tr>
          </tbody>
        </TableWrap>
        <Callout tone="amber" className="mt-3" title="Two ceilings, not one">
          <strong>50%</strong> is the adopted hard legal ceiling. <strong>45%</strong> is an internal working ceiling so that
          ordinary market appreciation does not push the portfolio through 50% between rebalancing dates. 45% is not a
          statutory limit and must never be described as one.
        </Callout>
      </Panel>

      <Panel title="The nine Circular 619 categories (verbatim, abridged)">
        <TableWrap>
          <thead>
            <tr>
              <Th>Clause</Th>
              <Th>Category</Th>
              <Th>Note for this trust</Th>
            </tr>
          </thead>
          <tbody>
            {C619_CATEGORIES.map((c) => (
              <tr key={c.clause}>
                <Td className="font-mono text-xs">{c.clause}</Td>
                <Td>{c.text}</Td>
                <Td className="text-xs text-slate-600">{c.note}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="mt-2 text-xs text-slate-500">
          Provisos: clauses (d), (e) and (f) require a minimum AA rating from at least two SEBI-registered agencies; where more
          than two ratings exist, the two lowest count.
        </p>
      </Panel>

      <Panel title="Base tier vs Circular 619 tier" description="The instrument itself determines the regulatory tier — not what it economically owns">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusPill tone="green">Base tier — uncapped</StatusPill>
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Instrument</Th>
                  <Th>Gate 1</Th>
                  <Th>Gate 2</Th>
                </tr>
              </thead>
              <tbody>
                <tr><Td>Scheduled-bank deposits</Td><Td className="text-xs">s.35 deposit</Td><Td className="text-xs">s.11(5)(iii)</Td></tr>
                <tr><Td>Post-office deposits</Td><Td className="text-xs">s.35 deposit</Td><Td className="text-xs">s.11(5)(i)</Td></tr>
                <tr><Td>G-Secs, T-Bills, SDLs (direct)</Td><Td className="text-xs">public security s.2(12)</Td><Td className="text-xs">s.11(5)(ii)</Td></tr>
                <tr><Td>Government-guaranteed bonds</Td><Td className="text-xs">public security s.2(12)</Td><Td className="text-xs">s.11(5)(ii)/(v)</Td></tr>
              </tbody>
            </TableWrap>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusPill tone="blue">Circular 619 tier — capped at 50%</StatusPill>
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Instrument</Th>
                  <Th>Gate 1</Th>
                  <Th>Gate 2</Th>
                </tr>
              </thead>
              <tbody>
                <tr><Td>Debt mutual funds</Td><Td className="text-xs">clause (c)</Td><Td className="text-xs">17C(i)</Td></tr>
                <tr><Td>Equity mutual funds (≥65% Indian-listed)</Td><Td className="text-xs">clause (h)</Td><Td className="text-xs">17C(i)</Td></tr>
                <tr><Td>Nifty 50 / Sensex 30 index funds & ETFs</Td><Td className="text-xs">clause (i)</Td><Td className="text-xs">17C(i)</Td></tr>
                <tr><Td>PSU bonds (O3 open)</Td><Td className="text-xs">clause (g) / public sec.</Td><Td className="text-xs">s.11(5)(vii)</Td></tr>
                <tr><Td>PSU shares (mcap ≥ ₹5,000 cr)</Td><Td className="text-xs">clause (g)</Td><Td className="text-xs">s.11(5)(vii)</Td></tr>
              </tbody>
            </TableWrap>
          </div>
        </div>
        <Callout tone="blue" className="mt-4" title="Worked example — the same exposure, two different tiers">
          A direct G-Sec is a “public security” → base tier → consumes no Circular 619 capacity. A gilt mutual fund holding
          the same bonds is a clause (c) unit → Circular 619 tier → consumes capacity. Wherever a direct instrument and a
          fund wrapper give the same exposure, the direct instrument is cheaper in cap terms — so scarce Circular 619
          capacity is reserved for what only a fund can provide: diversified equity.
        </Callout>
      </Panel>

      <Panel title="Consequences of a breach — proportionate, not catastrophic" description="Section 7 and Section 19 · legal research, not tax advice">
        <ul className="divide-y divide-slate-100">
          {BREACH_CONSEQUENCES.map((b) => (
            <li key={b.ref} className="grid gap-2 py-2 sm:grid-cols-[7rem_1fr]">
              <span className="font-mono text-xs font-semibold text-slate-800">{b.ref}</span>
              <span className="text-sm text-slate-700">{b.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Commentary suggests pre-existing holdings need not be force-unwound. The position should be remediated toward the
          box in an orderly way, not panic-sold. Confirm with a chartered accountant before acting.
        </p>
      </Panel>
    </>
  )
}
