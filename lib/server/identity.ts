import { REDACTED_IDENTITY, type Identity } from "@/lib/identity"

/** The client's identifying details from DASHBOARD_IDENTITY, or null if unset / invalid. */
export function configuredIdentity(): Identity | null {
  // Tolerate the value being pasted with its surrounding quotes from .env.local.
  const raw = process.env.DASHBOARD_IDENTITY?.trim().replace(/^'([\s\S]*)'$/, "$1")
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof Identity, unknown>>
    const identity: Identity = { ...REDACTED_IDENTITY }
    for (const key of Object.keys(identity) as (keyof Identity)[]) {
      const value = parsed[key]
      if (typeof value === "string" && value.trim()) identity[key] = value.trim()
    }
    return identity
  } catch {
    return null
  }
}
