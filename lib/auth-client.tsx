"use client"

import * as React from "react"

import { REDACTED_IDENTITY, type Identity } from "@/lib/identity"

export const PROTECTED_PREFIXES = ["/implementation", "/governance"]

interface AuthState {
  user: string | null
  configured: boolean
  loading: boolean
  /** Client identity — real details when signed in, placeholders otherwise. */
  identity: Identity
  identityRevealed: boolean
}

interface AuthContextValue extends AuthState {
  refresh: () => void
  signOut: () => Promise<void>
}

const SIGNED_OUT = { user: null, identity: REDACTED_IDENTITY, identityRevealed: false }

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ ...SIGNED_OUT, configured: true, loading: true })

  const refresh = React.useCallback(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(
        (r) =>
          r.json() as Promise<{ user: string | null; configured: boolean; identity?: Identity; identityRevealed?: boolean }>
      )
      .then((j) =>
        setState({
          user: j.user,
          configured: j.configured,
          loading: false,
          identity: j.identity ?? REDACTED_IDENTITY,
          identityRevealed: Boolean(j.identityRevealed),
        })
      )
      .catch(() => setState((s) => ({ ...s, loading: false })))
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const signOut = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setState((s) => ({ ...s, ...SIGNED_OUT }))
    if (PROTECTED_PREFIXES.some((p) => window.location.pathname.startsWith(p))) window.location.assign("/")
  }, [])

  const value = React.useMemo(() => ({ ...state, refresh, signOut }), [state, refresh, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
