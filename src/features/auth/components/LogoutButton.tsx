import { useState } from "react"
import { LogOut } from "lucide-react"

import { useLogout } from "@/features/auth/hooks/useLogout"
import { cn } from "@/lib/utils"
import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"

type LogoutButtonProps = {
  variant: "desktop" | "mobile"
}

export function LogoutButton({ variant }: LogoutButtonProps) {
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

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600",
          variant === "desktop"
            ? "h-10 w-10 rounded-full"
            : "h-16 flex-col gap-1 text-xs",
        )}
        aria-label="Log out"
        title={variant === "desktop" ? "Log out" : undefined}
        onClick={openConfirmation}
      >
        <LogOut className="h-5 w-5" />
        {variant === "mobile" && <span>Log out</span>}
      </button>

      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        title="Log out?"
        description="You will need to sign in again to manage your listings and saved places."
        confirmLabel={logoutMutation.isPending ? "Logging out..." : "Log out"}
        tone="danger"
        icon={<LogOut className="h-5 w-5 text-rose-600" />}
        error={errorMessage}
        isSubmitting={logoutMutation.isPending}
        closeAriaLabel="Close logout confirmation"
        onClose={closeConfirmation}
        onConfirm={logoutMutation.logout}
      />
    </>
  )
}

