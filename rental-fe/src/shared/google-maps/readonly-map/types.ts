import type {
  MapPosition,
  SearchLinesGeometry,
} from "@/features/map-search/types"
import type { SearchBounds } from "@/features/map-search/hooks/useMapBounds"

export type { MapPosition, SearchBounds, SearchLinesGeometry }

/** Building pin or landmark — no coverage. */
export type ReadOnlyMapPointGeo = {
  kind: "point"
  position: MapPosition
}

/** Nearby / pin search with radius coverage. */
export type ReadOnlyMapCircleGeo = {
  kind: "circle"
  center: MapPosition
  radiusMeters: number
}

/**
 * Line search with corridor coverage.
 * Prefer `paths` (lat/lng). Use {@link searchLinesGeometryToPaths} for GeoJSON.
 */
export type ReadOnlyMapLineGeo = {
  kind: "line"
  paths: MapPosition[][]
  distanceMeters: number
}

/** Viewport / "search this area" rectangle. */
export type ReadOnlyMapAreaGeo = {
  kind: "area"
  bounds: SearchBounds
}

export type ReadOnlyMapGeo =
  | ReadOnlyMapPointGeo
  | ReadOnlyMapCircleGeo
  | ReadOnlyMapLineGeo
  | ReadOnlyMapAreaGeo

export type NormalizedReadOnlyMapScene =
  | {
      kind: "point"
      position: MapPosition
      sceneKey: string
    }
  | {
      kind: "circle"
      center: MapPosition
      radiusMeters: number
      sceneKey: string
    }
  | {
      kind: "line"
      paths: MapPosition[][]
      distanceMeters: number
      sceneKey: string
    }
  | {
      kind: "area"
      bounds: SearchBounds
      sceneKey: string
    }

export type ReadOnlyMapProps = {
  geo: ReadOnlyMapGeo | null | undefined
  className?: string
  /**
   * Stable Google Map instance id. Required uniqueness when multiple maps
   * share a page; defaults to a React `useId`-derived value.
   */
  mapInstanceId?: string
  /**
   * When true, users may pan and zoom. When false (default), gestures are
   * locked — the map only shows the fitted geo scene.
   */
  navigable?: boolean
  /** Padding (px) for fitBounds. Default 48. */
  fitPadding?: number
  /** Empty / invalid geo message. */
  emptyMessage?: string
}
