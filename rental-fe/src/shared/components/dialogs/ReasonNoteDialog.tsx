import { X } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import {
  SingleOptionSelector,
  type SingleOptionValue,
  type SingleOptionActiveColor,
} from "@/shared/components/inputs/SingleOptionSelector"

import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "./DialogShell"

export type ReasonNoteDialogTone = "neutral" | "red" | "green"

export type ReasonNoteDialogOption<TValue extends string> = {
  label: string
  value: TValue
}

type ReasonNoteDialogProps<TValue extends string> = {
  isOpen: boolean
  title: string
  description: string
  icon?: ReactNode
  tone?: ReasonNoteDialogTone
  itemSummary?: ReactNode
  additionalFields?: ReactNode
  reasonLabel?: string
  reasonOptions?: ReasonNoteDialogOption<TValue>[]
  selectedReason?: TValue | ""
  reasonActiveColor?: SingleOptionActiveColor
  noteLabel?: string
  note: string
  showNoteField?: boolean
  notePlaceholder?: string
  noteMaxLength?: number
  error?: string | null
  successMessage?: string | null
  confirmLabel: string
  cancelLabel?: string
  isSubmitting?: boolean
  canSubmit?: boolean
  showCloseButton?: boolean
  closeAriaLabel?: string
  onReasonChange?: (reason: TValue | "") => void
  onNoteChange: (note: string) => void
  onCancel: () => void
  onSubmit: () => void
}

const iconToneClasses: Record<ReasonNoteDialogTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  red: "bg-red-50 text-red-600",
  green: "bg-emerald-50 text-emerald-600",
}

const confirmToneClasses: Record<ReasonNoteDialogTone, string> = {
  neutral: "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300",
  red: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  green:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
}

const reasonActiveColors: Record<
  ReasonNoteDialogTone,
  SingleOptionActiveColor
> = {
  neutral: "black",
  red: "red",
  green: "green",
}

export function ReasonNoteDialog<TValue extends string>({
  isOpen,
  title,
  description,
  icon,
  tone = "neutral",
  itemSummary,
  additionalFields,
  reasonLabel = "Reason",
  reasonOptions = [],
  selectedReason = "",
  reasonActiveColor,
  noteLabel = "Details",
  note,
  showNoteField = true,
  notePlaceholder = "Add details, or write a custom reason if none of the options fit.",
  noteMaxLength,
  error = "",
  successMessage = "",
  confirmLabel,
  cancelLabel = "Cancel",
  isSubmitting = false,
  canSubmit = true,
  showCloseButton = false,
  closeAriaLabel = "Close dialog",
  onReasonChange,
  onNoteChange,
  onCancel,
  onSubmit,
}: ReasonNoteDialogProps<TValue>) {
  if (!isOpen) return null

  return (
    <DialogShell
      isOpen={isOpen}
      isDismissDisabled={isSubmitting}
      onDismiss={onCancel}
      contentClassName="max-w-lg rounded-2xl p-5 text-left"
    >
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-slate-100",
                  iconToneClasses[tone],
                )}
              >
                {icon}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold text-slate-950">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </DialogDescription>
            </div>

            {showCloseButton && (
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={closeAriaLabel}
                disabled={isSubmitting}
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {itemSummary && (
            <div className="mt-5 rounded-xl bg-slate-50 p-3">
              {itemSummary}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {reasonOptions.length > 0 && (
              <SingleOptionSelector
                label={reasonLabel}
                options={reasonOptions}
                value={selectedReason}
                size="small"
                disabled={isSubmitting}
                activeColor={reasonActiveColor ?? reasonActiveColors[tone]}
                onChange={(value?: SingleOptionValue) => {
                  onReasonChange?.((value ?? "") as TValue | "")
                }}
              />
            )}

            {additionalFields}

            {showNoteField && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  {noteLabel}
                </span>
                <textarea
                  rows={4}
                  value={note}
                  maxLength={noteMaxLength}
                  disabled={isSubmitting}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  placeholder={notePlaceholder}
                  onChange={(event) => onNoteChange(event.target.value)}
                />
              </label>
            )}
          </div>

          {error && (
            <p
              className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          {successMessage && (
            <p
              className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
              role="status"
            >
              {successMessage}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              className="flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed",
                confirmToneClasses[tone],
              )}
              disabled={isSubmitting || !canSubmit}
              onClick={onSubmit}
            >
              {isSubmitting && <LoaderIcon className="h-4 w-4" />}
              {confirmLabel}
            </button>
          </div>
    </DialogShell>
  )
}
