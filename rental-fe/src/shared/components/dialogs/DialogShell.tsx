import { Dialog } from "radix-ui"
import { useCallback, useRef, type ComponentProps, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  ensureFocusTracking,
  getFocusRestoreTarget,
} from "@/shared/utils/focusHistory"
import { getModalRoot } from "@/shared/utils/getModalRoot"

type DialogShellProps = {
  children: ReactNode
  contentClassName?: string
  overlayClassName?: string
  isDismissDisabled?: boolean
  isOpen: boolean
  onDismiss: () => void
}

export function DialogShell({
  children,
  contentClassName,
  overlayClassName,
  isDismissDisabled = false,
  isOpen,
  onDismiss,
}: DialogShellProps) {
  ensureFocusTracking()
  const contentElementRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const contentRef = useCallback((element: HTMLDivElement | null) => {
    if (element && !contentElementRef.current) {
      previouslyFocusedElementRef.current = getFocusRestoreTarget(element)
    }
    contentElementRef.current = element
  }, [])

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isDismissDisabled) onDismiss()
      }}
    >
      <Dialog.Portal container={getModalRoot()}>
        <Dialog.Overlay
          data-slot="dialog-overlay"
          className={cn(
            "fixed inset-0 z-[1000] bg-slate-950/35",
            overlayClassName,
          )}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDismissDisabled) {
              onDismiss()
            }
          }}
        />
        <Dialog.Content
          ref={contentRef}
          data-slot="dialog-content"
          className={cn(
            "fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-white shadow-xl outline-none",
            contentClassName,
          )}
          onEscapeKeyDown={(event) => {
            event.stopPropagation()
            if (isDismissDisabled) event.preventDefault()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            const restoreTarget = previouslyFocusedElementRef.current
            if (restoreTarget && document.contains(restoreTarget)) {
              restoreTarget.focus()
            }
            previouslyFocusedElementRef.current = null
          }}
          onPointerDownOutside={(event) => {
            event.preventDefault()
          }}
          onInteractOutside={(event) => {
            event.preventDefault()
          }}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function DialogTitle(props: ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title {...props} />
}

export function DialogDescription(
  props: ComponentProps<typeof Dialog.Description>,
) {
  return <Dialog.Description {...props} />
}
