import { createContext, useContext } from "react"

import type { AdminUserDetails } from "../../api"

export type RemoveAdminRoleAction = AdminUserDetails | null

export type PlatformAdminReviewContextValue = {
  selectedAdmin: AdminUserDetails | null
  action: RemoveAdminRoleAction
  error: string | null
  isSubmitting: boolean
  selectAdmin: (adminId: string | null) => void
  openRemoveAdminDialog: (admin: AdminUserDetails) => void
  closeRemoveAdminDialog: () => void
  confirmRemoveAdmin: () => void
}

export const PlatformAdminReviewContext =
  createContext<PlatformAdminReviewContextValue | null>(null)

export function usePlatformAdminReview() {
  const context = useContext(PlatformAdminReviewContext)

  if (!context) {
    throw new Error(
      "usePlatformAdminReview must be used inside PlatformAdminsTab",
    )
  }

  return context
}
