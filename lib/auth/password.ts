import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

import { configuredUsers } from "@/lib/auth/config"

const scrypt = promisify(scryptCallback) as unknown as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

// Used when the username is unknown, so a miss costs the same time as a wrong password.
const DUMMY_HASH = `scrypt.${"00".repeat(16)}.${"00".repeat(64)}`

export async function verifyPassword(username: string, password: string) {
  const stored = configuredUsers().get(username.trim().toLowerCase())
  const [, saltHex = "", hashHex = ""] = (stored ?? DUMMY_HASH).split(".")
  const expected = Buffer.from(hashHex, "hex")
  if (expected.length === 0) return false
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)
  return stored !== undefined && timingSafeEqual(expected, actual)
}
