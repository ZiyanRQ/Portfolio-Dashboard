import { NextResponse, type NextRequest } from "next/server"

import { readSession, SESSION_COOKIE } from "@/lib/auth/session"

/** Implementation and Governance hold editable records — sign-in required. */
export async function proxy(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()

  const login = new URL("/login", request.url)
  login.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/implementation/:path*", "/governance/:path*"],
}
