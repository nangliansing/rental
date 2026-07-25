import { createContext, useContext, type ReactNode } from "react"

import type { AuthUser } from "@/features/auth/api"

import type { AgentProfile } from "../api"

type MyProfileLogoutState = {
  isLoggingOut: boolean
  error: string
  logout: () => void | Promise<void>
  reset?: () => void
}

export type MyProfileContextValue = {
  user: AuthUser | null
  profile: AgentProfile
  onProfileChange: (profile: AgentProfile) => void
  logout: MyProfileLogoutState
}

const MyProfileContext = createContext<MyProfileContextValue | null>(null)

export function MyProfileProvider({
  value,
  children,
}: {
  value: MyProfileContextValue
  children: ReactNode
}) {
  return (
    <MyProfileContext.Provider value={value}>{children}</MyProfileContext.Provider>
  )
}

export function useMyProfile() {
  const context = useContext(MyProfileContext)

  if (!context) {
    throw new Error("useMyProfile must be used within MyProfileProvider")
  }

  return context
}
