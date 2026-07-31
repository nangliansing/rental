import { type LucideIcon } from "lucide-react"

import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { hasReactNodeContent } from "@/shared/utils/reactNode"

export type FormTabTriggerProps = {
  id?: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  isLoading?: boolean
  readOnly?: boolean
  required?: boolean
  error?: ReactNode
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-expanded"?: boolean
  className?: string
  onClick?: () => void
}

/**
 * Compact chip/tab trigger used to open a picker modal (icon + label only).
 * Width hugs content; place in a horizontal scroll row when needed.
 */
export function FormTabTrigger({
  id,
  label,
  icon: Icon,
  disabled = false,
  isLoading = false,
  readOnly = false,
  required = false,
  error,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-expanded": ariaExpanded,
  className,
  onClick,
}: FormTabTriggerProps) {
  const showError = hasReactNodeContent(error)
  const isAriaInvalid =
    showError || ariaInvalid === true || ariaInvalid === "true"
  const isInteractionLocked = disabled || isLoading || readOnly
  const errorId = id ? `${id}-error` : undefined
  const describedBy = [ariaDescribedBy, showError ? errorId : undefined]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="inline-flex shrink-0 flex-col">
      <button
        id={id}
        type="button"
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-readonly={readOnly || undefined}
        aria-busy={isLoading || undefined}
        aria-haspopup="dialog"
        aria-expanded={ariaExpanded}
        aria-describedby={describedBy || undefined}
        aria-invalid={isAriaInvalid || undefined}
        className={cn(
          "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 transition-colors outline-none hover:bg-slate-50 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
          readOnly && "cursor-default bg-slate-50 hover:bg-slate-50",
          isAriaInvalid &&
            "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
          className,
        )}
        onClick={() => {
          if (isInteractionLocked) return
          onClick?.()
        }}
      >
        {isLoading ? (
          <LoaderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
        ) : null}
        <span>{label}</span>
      </button>

      {showError && (
        <p
          id={errorId}
          className="mt-2 text-sm font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
