import { LogOut } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  LogoutConfirmationHost,
} from "./LogoutConfirmationDialog"
import { useLogoutConfirmation } from "../hooks/useLogoutConfirmation"

type LogoutButtonProps = {
  variant: "desktop" | "mobile"
}

export function LogoutButton({ variant }: LogoutButtonProps) {
  const logoutConfirmation = useLogoutConfirmation()

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
        onClick={logoutConfirmation.openConfirmation}
      >
        <LogOut className="h-5 w-5" />
        {variant === "mobile" && <span>Log out</span>}
      </button>

      <LogoutConfirmationHost confirmation={logoutConfirmation} />
    </>
  )
}
