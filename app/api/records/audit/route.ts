import { NextResponse, type NextRequest } from "next/server"

import { readSession, SESSION_COOKIE } from "@/lib/auth/session"
import { readAudit } from "@/lib/server/records"

export async function GET(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: "Sign in to view the change log" }, { status: 401 })
  const requested = Number(request.nextUrl.searchParams.get("limit") ?? 100)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(1, Math.floor(requested)), 500) : 100
  return NextResponse.json({ entries: await readAudit(limit) }, { headers: { "Cache-Control": "no-store" } })
}
