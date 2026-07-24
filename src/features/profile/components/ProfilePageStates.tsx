import { Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function ProfilePageLoading({
  message = "Checking your profile...",
}: {
  message?: string
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-slate-400" />
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

export function ProfileSetupRequired() {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <h1 className="text-2xl font-semibold">Create your profile first</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        You need a contact profile before you can edit it.
      </p>

      <Link
        to="/profile"
        className="mt-6 flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white"
      >
        Go to profile setup
      </Link>
    </div>
  )
}
