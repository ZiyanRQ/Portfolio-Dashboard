/**
 * Login configuration, read from environment variables (.env.local):
 *   AUTH_SECRET      — random string (≥ 32 chars) used to sign session cookies
 *   DASHBOARD_USERS  — comma-separated `username:scrypt.<saltHex>.<hashHex>` entries
 * Both are written by `npm run create-user`. Plain-text passwords are never stored.
 */

const USERNAME_RE = /^[A-Za-z0-9._-]{2,32}$/

export function authSecret(): string | null {
  const s = process.env.AUTH_SECRET
  return s && s.length >= 32 ? s : null
}

/** username (lower-case) → password hash */
export function configuredUsers(): Map<string, string> {
  const users = new Map<string, string>()
  for (const entry of (process.env.DASHBOARD_USERS ?? "").split(",")) {
    const i = entry.indexOf(":")
    if (i <= 0) continue
    const name = entry.slice(0, i).trim().toLowerCase()
    const hash = entry.slice(i + 1).trim()
    if (USERNAME_RE.test(name) && hash.startsWith("scrypt.")) users.set(name, hash)
  }
  return users
}

export function isAuthConfigured() {
  return authSecret() !== null && configuredUsers().size > 0
}
