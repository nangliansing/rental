import { useCallback, useEffect, useRef, useState } from "react"

type MapPosition = google.maps.LatLngLiteral

const DEFAULT_DURATION_MS = 650

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

function interpolateLongitude(from: number, to: number, progress: number) {
  const shortestDelta = ((to - from + 540) % 360) - 180
  return from + shortestDelta * progress
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

export function useMapCameraTransition(map: google.maps.Map | null) {
  const frameRef = useRef<number | null>(null)
  const transitionIdRef = useRef(0)
  const [isMoving, setIsMoving] = useState(false)

  const cancel = useCallback(() => {
    transitionIdRef.current += 1
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    setIsMoving(false)
  }, [])

  useEffect(() => cancel, [cancel])

  const flyTo = useCallback(
    (destination: MapPosition, targetZoom = 16) => {
      cancel()
      if (!map) return

      const startCenter = map.getCenter()
      const startZoom = map.getZoom()
      if (!startCenter || startZoom === undefined || prefersReducedMotion()) {
        map.moveCamera({ center: destination, zoom: targetZoom })
        return
      }

      const from = { lat: startCenter.lat(), lng: startCenter.lng() }
      const transitionId = transitionIdRef.current
      const startedAt = performance.now()
      setIsMoving(true)

      const moveFrame = (now: number) => {
        if (transitionId !== transitionIdRef.current) return

        const progress = Math.min((now - startedAt) / DEFAULT_DURATION_MS, 1)
        const easedProgress = easeInOutCubic(progress)
        map.moveCamera({
          center: {
            lat: from.lat + (destination.lat - from.lat) * easedProgress,
            lng: interpolateLongitude(from.lng, destination.lng, easedProgress),
          },
          zoom: startZoom + (targetZoom - startZoom) * easedProgress,
        })

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(moveFrame)
          return
        }

        frameRef.current = null
        setIsMoving(false)
      }

      frameRef.current = requestAnimationFrame(moveFrame)
    },
    [cancel, map],
  )

  return { flyTo, isMoving, cancel }
}
