import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function ProfilePageLoading({
  message = "Checking your profile...",
}: {
  message?: string
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
      <LoaderIcon className="mb-3 h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  )
}

export function ProfilePageError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <h1 className="text-2xl font-semibold">Could not load profile</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

      <Button className="mt-6 h-11 rounded-full" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

type ProfileSetupRequiredProps = {
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export function ProfileSetupRequired({
  title = "Create your profile first",
  description = "You need a contact profile before you can edit it.",
  actionLabel = "Go to profile setup",
  actionHref = "/profile",
}: ProfileSetupRequiredProps) {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <Link
        to={actionHref}
        className="mt-6 flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white"
      >
        {actionLabel}
      </Link>
    </div>
  )
}
