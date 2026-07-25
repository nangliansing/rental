import { MapPin } from "lucide-react"

import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"

import { getDirectionsConfirmDescription } from "../utils/directionsDisplay"

type DirectionsConfirmDialogProps = {
  destinationLabel?: string | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DirectionsConfirmDialog({
  destinationLabel,
  isOpen,
  onClose,
  onConfirm,
}: DirectionsConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title="Open directions?"
      description={getDirectionsConfirmDescription(destinationLabel)}
      confirmLabel="Open Maps"
      closeAriaLabel="Close directions confirmation"
      icon={<MapPin className="h-5 w-5 text-slate-700" aria-hidden="true" />}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}
