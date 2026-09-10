import { NextResponse, type NextRequest } from "next/server"

import { emptyRecords, PUBLIC_TABLES, type RecordsResponse } from "@/lib/data/records"
import { readSession, SESSION_COOKIE } from "@/lib/auth/session"
import { applyChange, readRecords, storageWritable } from "@/lib/server/records"
import { parseChange } from "@/lib/server/records-schema"

const NO_STORE = { "Cache-Control": "no-store" }

export async function GET(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  const records = await readRecords()
  if (session) {
    return NextResponse.json({ ...records, restricted: false, writable: storageWritable } satisfies RecordsResponse, { headers: NO_STORE })
  }
  // Signed out: only public tables (the assumption register), no editor names.
  const open: RecordsResponse = { ...emptyRecords(), version: records.version, restricted: true, writable: storageWritable }
  for (const t of PUBLIC_TABLES) Object.assign(open, { [t]: records[t] })
  return NextResponse.json(open, { headers: NO_STORE })
}

export async function PATCH(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: "Sign in to edit shared records" }, { status: 401 })
  if (!storageWritable) {
    return NextResponse.json({ error: "This host has no persistent disk — shared records cannot be saved here" }, { status: 501 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  const change = parseChange(body)
  if (typeof change === "string") return NextResponse.json({ error: change }, { status: 400 })

  try {
    const records = await applyChange(session.user, change)
    return NextResponse.json({ ...records, restricted: false, writable: true } satisfies RecordsResponse, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: "Could not write the records file" }, { status: 500 })
  }
}
