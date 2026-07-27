import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { ModalPortal } from "@/shared/components/ModalPortal"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

import {
  getResponsiveScreenModalPanelClass,
  RESPONSIVE_SCREEN_MODAL_BACKDROP_CLASS,
  type ResponsiveScreenModalSize,
} from "./responsiveScreenModalLayout"

export type ResponsiveScreenModalRenderProps = {
  requestClose: () => void
}

type ResponsiveScreenModalProps = {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  trackBrowserHistory?: boolean
  size?: ResponsiveScreenModalSize
  backdropClassName?: string
  panelClassName?: string
  children: (props: ResponsiveScreenModalRenderProps) => ReactNode
}

function normalizeModalAriaLabel(label: string): string {
  const trimmed = label.trim()
  return trimmed || "Dialog"
}

export function ResponsiveScreenModal({
  isOpen,
  onClose,
  ariaLabel,
  trackBrowserHistory = true,
  size = "default",
  backdropClassName,
  panelClassName,
  children,
}: ResponsiveScreenModalProps) {
  const { containerRef, onBackdropClick, requestClose } =
    useAccessibleModal<HTMLElement>({
      isOpen,
      onClose,
      trackBrowserHistory,
    })

  if (!isOpen) return null

  return (
    <ModalPortal>
      <div
        className={cn(RESPONSIVE_SCREEN_MODAL_BACKDROP_CLASS, backdropClassName)}
        role="dialog"
        aria-modal="true"
        aria-label={normalizeModalAriaLabel(ariaLabel)}
        onClick={onBackdropClick}
      >
        <section
          ref={containerRef}
          tabIndex={-1}
          className={getResponsiveScreenModalPanelClass(size, panelClassName)}
          onClick={(event) => event.stopPropagation()}
        >
          {children({ requestClose })}
        </section>
      </div>
    </ModalPortal>
  )
}
