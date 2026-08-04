import { memo, useEffect, useRef } from "react"
import { useMap } from "@vis.gl/react-google-maps"

import {
  getReadOnlyMapCameraTarget,
  type ReadOnlyMapCameraTarget,
} from "./camera"
import type { NormalizedReadOnlyMapScene } from "./types"

const DEFAULT_FIT_PADDING = 48

function applyCameraTarget(
  map: google.maps.Map,
  target: ReadOnlyMapCameraTarget,
  fitPadding: number,
) {
  if (target.mode === "center") {
    map.setCenter(target.center)
    map.setZoom(target.zoom)
    return
  }

  map.fitBounds(target.bounds, fitPadding)
}

/**
 * Fits the camera once per scene fingerprint. Depends only on `sceneKey` so
 * new object identities for the same geo do not re-trigger fitBounds.
 */
export const ReadOnlyMapCamera = memo(function ReadOnlyMapCamera({
  scene,
  fitPadding = DEFAULT_FIT_PADDING,
}: {
  scene: NormalizedReadOnlyMapScene
  fitPadding?: number
}) {
  const map = useMap()
  const fittedSceneKeyRef = useRef<string | null>(null)
  const sceneRef = useRef(scene)
  const fitPaddingRef = useRef(fitPadding)

  sceneRef.current = scene
  fitPaddingRef.current = fitPadding

  useEffect(() => {
    if (!map) return
    if (fittedSceneKeyRef.current === scene.sceneKey) return

    fittedSceneKeyRef.current = scene.sceneKey

    // Modal / late-mounted containers often need a resize before fitBounds paints.
    google.maps.event.trigger(map, "resize")
    applyCameraTarget(
      map,
      getReadOnlyMapCameraTarget(sceneRef.current),
      fitPaddingRef.current,
    )
  }, [map, scene.sceneKey])

  return null
})
