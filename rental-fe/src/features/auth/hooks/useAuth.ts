import { useContext } from "react"

import { AuthContext } from "../auth-context"
export { CURRENT_USER_QUERY_KEY } from "../auth-query"

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
