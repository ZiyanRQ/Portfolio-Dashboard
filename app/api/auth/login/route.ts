import { NextResponse, type NextRequest } from "next/server"

import { isAuthConfigured } from "@/lib/auth/config"
import { verifyPassword } from "@/lib/auth/password"
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session"

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 10
const failures = new Map<string, { count: number; since: number }>()

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 })

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"
  const now = Date.now()
  const prior = failures.get(ip)
  const recent = prior && now - prior.since < WINDOW_MS ? prior : null
  if (recent && recent.count >= MAX_FAILURES) {
    return NextResponse.json({ error: "too-many-attempts" }, { status: 429 })
  }

  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 })
  }
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!username || !password || password.length > 256) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  if (!(await verifyPassword(username, password))) {
    failures.set(ip, { count: (recent?.count ?? 0) + 1, since: recent?.since ?? now })
    await new Promise((done) => setTimeout(done, 500))
    return NextResponse.json({ error: "invalid" }, { status: 401 })
  }

  failures.delete(ip)
  const response = NextResponse.json({ user: username })
  response.cookies.set(SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
  return response
}
