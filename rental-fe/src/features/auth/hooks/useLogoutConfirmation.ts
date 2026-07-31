import { useState } from "react"

import { useLogout } from "./useLogout"

export function useLogoutConfirmation() {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const logoutMutation = useLogout()
  const errorMessage = logoutMutation.error
    ? logoutMutation.error instanceof Error
      ? logoutMutation.error.message
      : "Could not log out. Please try again."
    : ""

  const openConfirmation = () => {
    logoutMutation.reset()
    setIsConfirmationOpen(true)
  }

  const closeConfirmation = () => {
    if (logoutMutation.isPending) return

    logoutMutation.reset()
    setIsConfirmationOpen(false)
  }

  return {
    isConfirmationOpen,
    isSubmitting: logoutMutation.isPending,
    errorMessage,
    openConfirmation,
    closeConfirmation,
    confirmLogout: logoutMutation.logout,
  }
}
