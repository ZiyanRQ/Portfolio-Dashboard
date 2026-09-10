/**
 * Live INR exchange rates, fetched server-side so the browser never makes a
 * cross-origin request. Returns INR per one GBP / USD.
 */
export async function GET() {
  try {
    const r = await fetch("https://api.frankfurter.dev/v1/latest?base=INR&symbols=GBP,USD", { next: { revalidate: 3600 } })
    if (!r.ok) throw new Error(String(r.status))
    const j = (await r.json()) as { date: string; rates: { GBP: number; USD: number } }
    return Response.json({ GBP: 1 / j.rates.GBP, USD: 1 / j.rates.USD, asOf: j.date, source: "ECB reference rate (Frankfurter)" })
  } catch {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/INR", { next: { revalidate: 3600 } })
      if (!r.ok) throw new Error(String(r.status))
      const j = (await r.json()) as { time_last_update_utc: string; rates: { GBP: number; USD: number } }
      return Response.json({
        GBP: 1 / j.rates.GBP,
        USD: 1 / j.rates.USD,
        asOf: new Date(j.time_last_update_utc).toISOString().slice(0, 10),
        source: "ExchangeRate-API open rate",
      })
    } catch {
      return Response.json({ error: "Live rate unavailable" }, { status: 502 })
    }
  }
}
