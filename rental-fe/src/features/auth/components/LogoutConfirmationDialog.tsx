import { LogOut } from "lucide-react"

import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"

import { useLogoutConfirmation } from "../hooks/useLogoutConfirmation"

type LogoutConfirmationDialogProps = {
  isOpen: boolean
  onClose: () => void
  isSubmitting: boolean
  errorMessage: string
  onConfirm: () => void
}

export function LogoutConfirmationDialog({
  isOpen,
  onClose,
  isSubmitting,
  errorMessage,
  onConfirm,
}: LogoutConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title="Log out?"
      description="You will need to sign in again to manage your listings and saved places."
      confirmLabel={isSubmitting ? "Logging out..." : "Log out"}
      tone="danger"
      icon={<LogOut className="h-5 w-5 text-rose-600" />}
      error={errorMessage}
      isSubmitting={isSubmitting}
      closeAriaLabel="Close logout confirmation"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

type LogoutConfirmationHostProps = {
  confirmation: ReturnType<typeof useLogoutConfirmation>
}

export function LogoutConfirmationHost({
  confirmation,
}: LogoutConfirmationHostProps) {
  return (
    <LogoutConfirmationDialog
      isOpen={confirmation.isConfirmationOpen}
      isSubmitting={confirmation.isSubmitting}
      errorMessage={confirmation.errorMessage}
      onClose={confirmation.closeConfirmation}
      onConfirm={confirmation.confirmLogout}
    />
  )
}
