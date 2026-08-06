import { X } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import {
  DIALOG_ACTION_BUTTON_DANGER_CLASSNAME,
  DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME,
  DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME,
} from "./dialogActionButtonStyles"
import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "./DialogShell"

type ConfirmationDialogTone = "neutral" | "danger"

type ConfirmationDialogProps = {
  isOpen: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: ConfirmationDialogTone
  icon?: ReactNode
  error?: string
  isSubmitting?: boolean
  closeAriaLabel?: string
  onClose: () => void
  onConfirm: () => void
}

const confirmButtonToneClasses: Record<ConfirmationDialogTone, string> = {
  neutral: DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME,
  danger: DIALOG_ACTION_BUTTON_DANGER_CLASSNAME,
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "neutral",
  icon,
  error = "",
  isSubmitting = false,
  closeAriaLabel = "Close confirmation",
  onClose,
  onConfirm,
}: ConfirmationDialogProps) {
  if (!isOpen) return null

  return (
    <DialogShell
      isOpen={isOpen}
      isDismissDisabled={isSubmitting}
      onDismiss={onClose}
      contentClassName="max-w-sm rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <DialogTitle className="text-base font-semibold text-slate-950">
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 text-sm leading-5 text-slate-500">
              {description}
            </div>
          </DialogDescription>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={closeAriaLabel}
          disabled={isSubmitting}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME}
          disabled={isSubmitting}
          onClick={onClose}
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          className={cn(confirmButtonToneClasses[tone])}
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting && <LoaderIcon className="h-4 w-4" />}
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}
