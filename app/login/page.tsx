"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { LockKeyhole } from "lucide-react"

import { useAuth } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/dashboard/ui"

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/implementation/plan"
}

function LoginForm() {
  const params = useSearchParams()
  const next = safeNext(params.get("next"))
  const { user, configured, loading, signOut } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (r.ok) {
        window.location.assign(next)
        return
      }
      setError(
        r.status === 429
          ? "Too many failed attempts. Try again in 15 minutes."
          : r.status === 503
            ? "Sign-in has not been set up on this server yet."
            : "Incorrect username or password."
      )
    } catch {
      setError("Could not reach the server.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm pt-6 md:pt-16">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-slate-900 text-white">
            <LockKeyhole className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sign in</h2>
            <p className="text-xs text-slate-500">Implementation and Governance records are restricted.</p>
          </div>
        </div>

        {loading ? null : user ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              You are signed in as <strong>{user}</strong>.
            </p>
            <div className="flex gap-2">
              <Button render={<Link href={next} />} size="sm">
                Continue
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : !configured ? (
          <Callout tone="amber" title="Sign-in has not been set up">
            Create a login from the project folder with <code className="font-mono">npm.cmd run create-user</code>, then restart
            the dev server.
          </Callout>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="username" className="text-xs font-medium text-slate-600">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" className="h-9 w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        Everything else in the dashboard stays open without signing in.{" "}
        <Link href="/" className="font-medium text-slate-700 hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
