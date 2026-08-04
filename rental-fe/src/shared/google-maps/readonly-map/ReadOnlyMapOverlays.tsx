import { memo, useMemo } from "react"
import {
  AdvancedMarker,
  Circle,
  Polygon,
  Polyline,
} from "@vis.gl/react-google-maps"
import { MapPin } from "lucide-react"

import type { SearchBounds } from "@/features/map-search/hooks/useMapBounds"
import type { MapPosition } from "@/features/map-search/types"
import { buildLineCoveragePolygon } from "@/features/map-search/utils/line-coverage"

import { searchBoundsToPolygonPath } from "./camera"
import type { NormalizedReadOnlyMapScene } from "./types"

const POINT_MARKER_ANCHOR = {
  anchorLeft: "-50%",
  anchorTop: "-100%",
} as const

const PointMarker = memo(function PointMarker({
  position,
  title,
}: {
  position: MapPosition
  title: string
}) {
  return (
    <AdvancedMarker
      position={position}
      zIndex={40}
      title={title}
      clickable={false}
      {...POINT_MARKER_ANCHOR}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md ring-4 ring-blue-100">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </div>
    </AdvancedMarker>
  )
})

const ReadOnlyCircleOverlays = memo(function ReadOnlyCircleOverlays({
  center,
  radiusMeters,
}: {
  center: MapPosition
  radiusMeters: number
}) {
  return (
    <>
      <Circle
        center={center}
        radius={radiusMeters}
        fillColor="#2563eb"
        fillOpacity={0.14}
        strokeColor="#2563eb"
        strokeOpacity={0.45}
        strokeWeight={2}
        clickable={false}
      />
      <PointMarker position={center} title="Search center" />
    </>
  )
})

const ReadOnlyLinePathOverlays = memo(function ReadOnlyLinePathOverlays({
  path,
  distanceMeters,
  pathIndex,
}: {
  path: MapPosition[]
  distanceMeters: number
  pathIndex: number
}) {
  const coveragePolygon = useMemo(
    () => buildLineCoveragePolygon(path, distanceMeters),
    [distanceMeters, path],
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

      {path.map((point, index) => (
        <Circle
          key={`line-cap-${pathIndex}-${index}-${point.lat}-${point.lng}`}
          center={point}
          radius={distanceMeters}
          fillColor="#7c3aed"
          fillOpacity={0.12}
          strokeOpacity={0}
          clickable={false}
        />
      ))}

      <Polyline
        path={path}
        strokeColor="#6d28d9"
        strokeOpacity={0.95}
        strokeWeight={4}
        clickable={false}
      />
    </>
  )
})

const ReadOnlyLineOverlays = memo(function ReadOnlyLineOverlays({
  paths,
  distanceMeters,
}: {
  paths: MapPosition[][]
  distanceMeters: number
}) {
  return (
    <>
      {paths.map((path, pathIndex) => (
        <ReadOnlyLinePathOverlays
          key={`line-path-${pathIndex}-${path[0]?.lat}-${path[0]?.lng}-${path.at(-1)?.lat}-${path.at(-1)?.lng}`}
          path={path}
          distanceMeters={distanceMeters}
          pathIndex={pathIndex}
        />
      ))}
    </>
  )
})

const ReadOnlyAreaOverlays = memo(function ReadOnlyAreaOverlays({
  bounds,
}: {
  bounds: SearchBounds
}) {
  const path = useMemo(() => searchBoundsToPolygonPath(bounds), [bounds])

  return (
    <Polygon
      paths={path}
      fillColor="#2563eb"
      fillOpacity={0.1}
      strokeColor="#2563eb"
      strokeOpacity={0.45}
      strokeWeight={2}
      clickable={false}
    />
  )
})

export const ReadOnlyMapOverlays = memo(function ReadOnlyMapOverlays({
  scene,
}: {
  scene: NormalizedReadOnlyMapScene
}) {
  switch (scene.kind) {
    case "point":
      return <PointMarker position={scene.position} title="Location" />
    case "circle":
      return (
        <ReadOnlyCircleOverlays
          center={scene.center}
          radiusMeters={scene.radiusMeters}
        />
      )
    case "line":
      return (
        <ReadOnlyLineOverlays
          paths={scene.paths}
          distanceMeters={scene.distanceMeters}
        />
      )
    case "area":
      return <ReadOnlyAreaOverlays bounds={scene.bounds} />
    default:
      return null
  }
})
