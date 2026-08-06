import { LogIn, UserRound } from "lucide-react"

import {
  DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME,
  DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME,
} from "@/shared/components/dialogs/dialogActionButtonStyles"

type LoginRequiredProps = {
  title?: string
  description?: string
  loginHref?: string
  secondaryHref?: string
  secondaryLabel?: string
}

export function LoginRequired({
  title = "Log in to continue",
  description = "Log in to continue using this page.",
  loginHref = "/login",
  secondaryHref = "/",
  secondaryLabel = "Go home",
}: LoginRequiredProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <UserRound className="h-6 w-6 text-slate-700" />
      </div>

      <h1 className="text-2xl font-semibold">{title}</h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-6 space-y-3">
        <a href={loginHref} className={DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME}>
          <LogIn className="h-4 w-4" />
          Log in
        </a>

        <a
          href={secondaryHref}
          className={DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME}
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  )
}
