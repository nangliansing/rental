import type { ReactNode } from "react"

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
  return (
    <div
      aria-label={label}
      className="cursor-pointer"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      {children}
    </div>
  )
}
