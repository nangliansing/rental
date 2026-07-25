import type { DirectionsDestination } from "../utils/buildGoogleMapsDirectionsUrl"
import { useDirectionsAction } from "../hooks/useDirectionsAction"
import { DirectionsConfirmDialog } from "./DirectionsConfirmDialog"
import { DirectionsTriggerButton } from "./DirectionsTriggerButton"

type DirectionsActionProps = {
  destination: DirectionsDestination | null | undefined
}

export function DirectionsAction({ destination }: DirectionsActionProps) {
  const {
    closeConfirmDialog,
    confirmDirections,
    destinationLabel,
    hasDirections,
    isConfirmOpen,
    openConfirmDialog,
  } = useDirectionsAction({ destination })

  if (!hasDirections) return null

  return (
    <>
      <DirectionsTriggerButton
        destinationLabel={destinationLabel}
        isOpen={isConfirmOpen}
        onClick={openConfirmDialog}
      />

      <DirectionsConfirmDialog
        destinationLabel={destinationLabel}
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDirections}
      />
    </>
  )
}
