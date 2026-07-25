import { useCallback, useMemo, useState } from "react"

import type { DirectionsDestination } from "../utils/buildGoogleMapsDirectionsUrl"
import { resolveDirectionsAction } from "../utils/directionsDisplay"
import { openExternalHref } from "../utils/openExternalHref"

type UseDirectionsActionOptions = {
  destination: DirectionsDestination | null | undefined
}

export function useDirectionsAction({
  destination,
}: UseDirectionsActionOptions) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const { destinationLabel, directionsUrl, hasDirections } = useMemo(
    () => resolveDirectionsAction(destination),
    [destination],
  )

  const openConfirmDialog = useCallback(() => {
    if (!directionsUrl) return
    setIsConfirmOpen(true)
  }, [directionsUrl])

  const closeConfirmDialog = useCallback(() => {
    setIsConfirmOpen(false)
  }, [])

  const confirmDirections = useCallback(() => {
    if (directionsUrl) {
      openExternalHref(directionsUrl)
    }

    setIsConfirmOpen(false)
  }, [directionsUrl])

  return {
    closeConfirmDialog,
    confirmDirections,
    destinationLabel,
    directionsUrl,
    hasDirections,
    isConfirmOpen,
    openConfirmDialog,
  }
}
