import type { ReactNode } from "react"

import { useMapOverlayTapSelect } from "@/shared/google-maps/useMapOverlayTapSelect"

type NeighbourhoodPlaceMarkerSurfaceProps = {
  label: string
  onSelect: () => void
  children: ReactNode
}

export function NeighbourhoodPlaceMarkerSurface({
  label,
  onSelect,
  children,
}: NeighbourhoodPlaceMarkerSurfaceProps) {
  const { onPointerDown, onClick } = useMapOverlayTapSelect(onSelect)

  return (
    <div
      aria-label={label}
      className="cursor-pointer"
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
