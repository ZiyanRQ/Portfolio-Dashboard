/**
 * Signed session tokens: base64url(JSON {u, exp}) + "." + base64url(HMAC-SHA256).
 * Uses Web Crypto so it works in the proxy and in route handlers.
 */
import { authSecret, configuredUsers } from "@/lib/auth/config"

export const SESSION_COOKIE = "tpa_session"
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const enc = new TextEncoder()

function toB64url(bytes: Uint8Array) {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromB64url(s: string) {
  let b = s.replace(/-/g, "+").replace(/_/g, "/")
  while (b.length % 4) b += "="
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0))
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
}

export async function createSessionToken(user: string) {
  const secret = authSecret()
  if (!secret) throw new Error("AUTH_SECRET is not configured")
  const payload = toB64url(enc.encode(JSON.stringify({ u: user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })))
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload)))
  return `${payload}.${toB64url(sig)}`
}

/** Returns the signed-in user, or null for a missing, forged, expired or revoked session. */
export async function readSession(token: string | undefined): Promise<{ user: string } | null> {
  const secret = authSecret()
  if (!token || !secret) return null
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(payload))
    if (!valid) return null
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { u?: unknown; exp?: unknown }
    if (typeof data.u !== "string" || typeof data.exp !== "number") return null
    if (data.exp * 1000 < Date.now()) return null
    // A user removed from DASHBOARD_USERS loses access immediately.
    if (!configuredUsers().has(data.u)) return null
    return { user: data.u }
  } catch {
    return null
  }
}
