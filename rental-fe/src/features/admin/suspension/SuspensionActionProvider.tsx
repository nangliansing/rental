import { useState, type ReactNode } from "react"

import { useCreateAdminSuspension } from "../api"
import { SuspensionActionDialog } from "./SuspensionActionDialog"
import {
  SuspensionActionContext,
  type SuspensionActionContextValue,
  type SuspensionActionTarget,
} from "./SuspensionActionContext"

export function SuspensionActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<SuspensionActionTarget | null>(null)
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [durationDays, setDurationDays] = useState(7)
  const [error, setError] = useState<string | null>(null)

  const suspensionMutation = useCreateAdminSuspension()

  const closeDialog = () => {
    setAction(null)
    setReason("")
    setNote("")
    setDurationDays(7)
    setError(null)
  }

  const openSuspensionDialog: SuspensionActionContextValue["openSuspensionDialog"] =
    (target) => {
      setAction(target)
      setReason("")
      setNote("")
      setDurationDays(7)
      setError(null)
    }

  const handleConfirm = () => {
    if (!action || suspensionMutation.isPending) return

    const trimmedReason = reason.trim()
    const trimmedNote = note.trim()

    if (!trimmedReason && !trimmedNote) {
      setError("Suspension reason is required.")
      return
    }

    const expiresAt = new Date(
      Date.now() + durationDays * 24 * 60 * 60 * 1000,
    ).toISOString()

    suspensionMutation.mutate(
      {
        userId: action.userId,
        reason: trimmedReason || trimmedNote,
        note: trimmedReason && trimmedNote ? trimmedNote : undefined,
        expiresAt,
      },
      {
        onSuccess: closeDialog,
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : "Could not suspend lister.",
          )
        },
      },
    )
  }

  return (
    <SuspensionActionContext.Provider value={{ openSuspensionDialog }}>
      {children}
      <SuspensionActionDialog
        action={action}
        reason={reason}
        note={note}
        durationDays={durationDays}
        error={error}
        isSubmitting={suspensionMutation.isPending}
        onReasonChange={(value) => {
          setReason(value)
          if (error) setError(null)
        }}
        onNoteChange={(value) => {
          setNote(value)
          if (error) setError(null)
        }}
        onDurationDaysChange={setDurationDays}
        onClose={closeDialog}
        onConfirm={handleConfirm}
      />
    </SuspensionActionContext.Provider>
  )
}
