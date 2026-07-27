import { ChevronLeft, X } from "lucide-react"
import type { MouseEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  MODAL_DISMISS_BACK_BUTTON_CLASS,
  MODAL_DISMISS_BAR_HEADER_CLASS,
  MODAL_DISMISS_CLOSE_BUTTON_CLASS,
  MODAL_DISMISS_INLINE_DESCRIPTION_CLASS,
  MODAL_DISMISS_INLINE_HEADER_CLASS,
  MODAL_DISMISS_INLINE_TITLE_CLASS,
  normalizeModalCloseLabel,
  shouldRenderModalDismissDescription,
} from "./modalDismissHeaderLayout"

type ModalDismissHeaderProps = {
  onClose: () => void
  closeLabel?: string
  className?: string
  title?: ReactNode
  description?: ReactNode
  trailing?: ReactNode
}

export function ModalDismissHeader({
  onClose,
  closeLabel,
  className,
  title,
  description,
  trailing,
}: ModalDismissHeaderProps) {
  const resolvedCloseLabel = normalizeModalCloseLabel(closeLabel)

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onClose()
  }

  const backButton = (
    <button
      type="button"
      className={MODAL_DISMISS_BACK_BUTTON_CLASS}
      aria-label={resolvedCloseLabel}
      onClick={handleClose}
    >
      <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" strokeWidth={2.25} />
      {!title && <span className="hidden md:inline">{resolvedCloseLabel}</span>}
    </button>
  )

  const closeButton = (
    <button
      type="button"
      className={MODAL_DISMISS_CLOSE_BUTTON_CLASS}
      aria-label={resolvedCloseLabel}
      onClick={handleClose}
    >
      <X className="h-5 w-5" />
    </button>
  )

  if (title) {
    return (
      <div className={cn(MODAL_DISMISS_INLINE_HEADER_CLASS, className)}>
        {backButton}

        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className={MODAL_DISMISS_INLINE_TITLE_CLASS}>{title}</h2>
          {shouldRenderModalDismissDescription(description) ? (
            <p className={MODAL_DISMISS_INLINE_DESCRIPTION_CLASS}>{description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {trailing}
          {closeButton}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(MODAL_DISMISS_BAR_HEADER_CLASS, className)}>
      {backButton}
      {closeButton}
    </div>
  )
}
