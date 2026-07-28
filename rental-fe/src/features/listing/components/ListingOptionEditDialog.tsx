import type { ReactNode } from "react"

import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"

type ListingOptionEditDialogProps = {
  isOpen: boolean
  isSubmitting?: boolean
  title: string
  description: string
  ariaLabel?: string
  onClose: () => void
  children: ReactNode
}

export function ListingOptionEditDialog({
  isOpen,
  isSubmitting = false,
  title,
  description,
  ariaLabel,
  onClose,
  children,
}: ListingOptionEditDialogProps) {
  const requestDismiss = () => {
    if (isSubmitting) return
    onClose()
  }

  return (
    <ResponsiveScreenModal
      isOpen={isOpen}
      onClose={requestDismiss}
      ariaLabel={ariaLabel ?? title}
      panelClassName="md:h-auto md:max-h-[min(720px,calc(100dvh-2rem))] md:max-w-md"
    >
      {({ requestClose }) => (
        <>
          <ModalDismissHeader
            title={title}
            description={description}
            onClose={() => {
              if (isSubmitting) return
              requestClose()
            }}
            className="shrink-0 border-b border-slate-100 px-4 py-3 md:px-5"
          />
          {children}
        </>
      )}
    </ResponsiveScreenModal>
  )
}
