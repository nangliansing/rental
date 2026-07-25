import { memo, useMemo } from "react"
import {
  AdvancedMarker,
  Circle,
  Polygon,
  Polyline,
} from "@vis.gl/react-google-maps"
import { MapPin } from "lucide-react"

import type { MapPosition, SearchedPlace } from "../../types"
import { buildLineCoveragePolygon } from "../../utils/line-coverage"
import { isValidMapPosition } from "../../utils/map-position"
import { MAX_LINE_SEARCH_POINTS } from "../../constants"

export const LineSearchOverlays = memo(function LineSearchOverlays({
  points,
  distanceMeters,
}: {
  points: MapPosition[]
  distanceMeters: number
}) {
  const validPoints = useMemo(
    () => points.filter(isValidMapPosition).slice(0, MAX_LINE_SEARCH_POINTS),
    [points],
  )
  const hasValidDistance =
    Number.isFinite(distanceMeters) && distanceMeters > 0
  const coveragePolygon = useMemo(
    () =>
      hasValidDistance
        ? buildLineCoveragePolygon(validPoints, distanceMeters)
        : [],
    [distanceMeters, hasValidDistance, validPoints],
  )

  return (
    <>
      {coveragePolygon.length >= 4 && (
        <Polygon
          paths={coveragePolygon}
          fillColor="#7c3aed"
          fillOpacity={0.12}
          strokeColor="#7c3aed"
          strokeOpacity={0.3}
          strokeWeight={1}
          clickable={false}
        />
      )}

      {hasValidDistance &&
        validPoints.length >= 2 &&
        validPoints.map((point, index) => (
          <Circle
            key={`line-coverage-${point.lat}-${point.lng}-${index}`}
            center={point}
            radius={distanceMeters}
            fillColor="#7c3aed"
            fillOpacity={0.12}
            strokeOpacity={0}
            clickable={false}
          />
        ))}

      {validPoints.length >= 2 && (
        <Polyline
          path={validPoints}
          strokeColor="#6d28d9"
          strokeOpacity={0.95}
          strokeWeight={4}
          clickable={false}
        />
      )}

      {validPoints.map((point, index) => (
        <AdvancedMarker
          key={`${point.lat}-${point.lng}-${index}`}
          position={point}
          zIndex={35}
          title={`Line point ${index + 1}`}
        >
          <span
            className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-violet-700 px-1 text-xs font-bold text-white shadow-lg"
            aria-hidden="true"
          >
            {index + 1}
          </span>
        </AdvancedMarker>
      ))}
    </>
  )
})

export const AreaPlaceMarker = memo(function AreaPlaceMarker({
  place,
}: {
  place: SearchedPlace
}) {
  if (!isValidMapPosition(place.position)) return null

  return (
    <AdvancedMarker position={place.position} zIndex={5}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-100">
        <MapPin className="h-5 w-5" />
      </div>
    </AdvancedMarker>
  )
})

export const PinRadiusOverlay = memo(function PinRadiusOverlay({
  position,
  radiusMeters,
}: {
  position: MapPosition
  radiusMeters: number
}) {
  if (
    !isValidMapPosition(position) ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return null
  }

  return (
    <Circle
      center={position}
      radius={radiusMeters}
      fillColor="#2563eb"
      fillOpacity={0.14}
      strokeColor="#2563eb"
      strokeOpacity={0.45}
      strokeWeight={2}
      clickable={false}
    />
  )
})
