import { createContext } from "react"

import type { AuthUser } from "./types"

export type AuthContextValue = {
  user: AuthUser | null
  userId?: string
  isAuthenticated: boolean
  isLoading: boolean
  isFetching: boolean
  isUnauthorized: boolean
  refetchUser: () => Promise<unknown>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
