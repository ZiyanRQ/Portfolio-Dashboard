import { NextResponse, type NextRequest } from "next/server"

import { REDACTED_IDENTITY } from "@/lib/identity"
import { isAuthConfigured } from "@/lib/auth/config"
import { readSession, SESSION_COOKIE } from "@/lib/auth/session"
import { configuredIdentity } from "@/lib/server/identity"

export async function GET(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  // Identifying details are only ever sent to a signed-in user.
  const identity = session ? configuredIdentity() : null
  return NextResponse.json(
    {
      user: session?.user ?? null,
      configured: isAuthConfigured(),
      identity: identity ?? REDACTED_IDENTITY,
      identityRevealed: identity !== null,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
