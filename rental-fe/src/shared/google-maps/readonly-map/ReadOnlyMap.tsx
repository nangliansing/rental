import { memo, useId, useMemo, useRef } from "react"
import { Map } from "@vis.gl/react-google-maps"

import { useGoogleMapsLoadState } from "@/features/map-search/hooks/useGoogleMapsLoadState"
import { GoogleMapsApiProvider } from "@/shared/google-maps/GoogleMapsApiProvider"
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_MAP_ID,
  hasGoogleMapsApiKey,
} from "@/shared/google-maps/googleMapsConfig"

import { getReadOnlyMapInitialCamera } from "./camera"
import { normalizeReadOnlyMapGeo } from "./normalizeReadOnlyMapGeo"
import { ReadOnlyMapCamera } from "./ReadOnlyMapCamera"
import { ReadOnlyMapOverlays } from "./ReadOnlyMapOverlays"
import type {
  NormalizedReadOnlyMapScene,
  ReadOnlyMapGeo,
  ReadOnlyMapProps,
} from "./types"

const DEFAULT_EMPTY_MESSAGE = "Map location is unavailable."
const DEFAULT_FIT_PADDING = 48

function sanitizeMapInstanceId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function useStableReadOnlyMapScene(
  geo: ReadOnlyMapGeo | null | undefined,
): NormalizedReadOnlyMapScene | null {
  const previousRef = useRef<NormalizedReadOnlyMapScene | null>(null)

  return useMemo(() => {
    const next = normalizeReadOnlyMapGeo(geo)
    if (next && previousRef.current?.sceneKey === next.sceneKey) {
      return previousRef.current
    }
    previousRef.current = next
    return next
  }, [geo])
}

function ReadOnlyMapStatusMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}

const ReadOnlyMapCanvas = memo(function ReadOnlyMapCanvas({
  scene,
  mapInstanceId,
  fitPadding,
  navigable,
}: {
  scene: NormalizedReadOnlyMapScene
  mapInstanceId: string
  fitPadding: number
  navigable: boolean
}) {
  const initialCamera = useMemo(
    () => getReadOnlyMapInitialCamera(scene),
    [scene],
  )

  return (
    <Map
      id={mapInstanceId}
      reuseMaps={false}
      mapId={GOOGLE_MAPS_MAP_ID}
      defaultCenter={initialCamera.center}
      defaultZoom={initialCamera.zoom}
      gestureHandling={navigable ? "cooperative" : "none"}
      disableDefaultUI
      clickableIcons={false}
      className="h-full w-full [&_.gm-style-cc]:opacity-70"
    >
      <ReadOnlyMapCamera scene={scene} fitPadding={fitPadding} />
      <ReadOnlyMapOverlays scene={scene} />
    </Map>
  )
})

type ReadOnlyMapFrameProps = {
  status: ReturnType<typeof useGoogleMapsLoadState>["status"]
  scene: NormalizedReadOnlyMapScene
  mapInstanceId: string
  fitPadding: number
  navigable: boolean
}

function ReadOnlyMapFrame({
  status,
  scene,
  mapInstanceId,
  fitPadding,
  navigable,
}: ReadOnlyMapFrameProps) {
  return (
    <div className="relative h-full w-full">
      {status === "loading" && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 text-sm font-medium text-slate-600"
          role="status"
        >
          Loading map...
        </div>
      )}
      {status === "error" ? (
        <ReadOnlyMapStatusMessage message="Map could not be loaded." />
      ) : (
        <ReadOnlyMapCanvas
          scene={scene}
          mapInstanceId={mapInstanceId}
          fitPadding={fitPadding}
          navigable={navigable}
        />
      )}
    </div>
  )
}

/**
 * Lightweight, defensive preview map for a single geo scene.
 * No edit handlers. Pan/zoom only when `navigable` is true.
 */
export function ReadOnlyMap({
  geo,
  className,
  mapInstanceId,
  navigable = false,
  fitPadding = DEFAULT_FIT_PADDING,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: ReadOnlyMapProps) {
  const reactId = useId()
  const resolvedMapInstanceId = sanitizeMapInstanceId(
    mapInstanceId?.trim() || `readonly-map-${reactId}`,
  )
  const scene = useStableReadOnlyMapScene(geo)
  const { status, markReady, markFailed } = useGoogleMapsLoadState(
    hasGoogleMapsApiKey(GOOGLE_MAPS_API_KEY),
  )

  if (!hasGoogleMapsApiKey(GOOGLE_MAPS_API_KEY)) {
    return (
      <div className={className}>
        <ReadOnlyMapStatusMessage message="Map configuration is missing." />
      </div>
    )
  }

  if (!scene) {
    return (
      <div className={className}>
        <ReadOnlyMapStatusMessage message={emptyMessage} />
      </div>
    )
  }

  return (
    <div className={className}>
      <GoogleMapsApiProvider onLoad={markReady} onError={markFailed}>
        <ReadOnlyMapFrame
          status={status}
          scene={scene}
          mapInstanceId={resolvedMapInstanceId}
          fitPadding={fitPadding}
          navigable={navigable}
        />
      </GoogleMapsApiProvider>
    </div>
  )
}
