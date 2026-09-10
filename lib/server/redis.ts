/**
 * Minimal Upstash Redis REST client (no dependency). Vercel's Upstash integration
 * sets KV_REST_API_URL / KV_REST_API_TOKEN; Upstash's own names are also accepted.
 */
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

export const redisConfigured = Boolean(url && token)

export async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  if (!url || !token) throw new Error("Redis is not configured")
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command.map(String)),
    cache: "no-store",
  })
  const body = (await r.json().catch(() => ({}))) as { result?: T; error?: string }
  if (!r.ok || body.error) throw new Error(body.error ?? `Redis request failed (${r.status})`)
  return body.result as T
}
