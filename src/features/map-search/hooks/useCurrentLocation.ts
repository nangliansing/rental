import { useCallback, useEffect, useRef, useState } from "react"

import type { MapPosition } from "../types"

export type CurrentLocationStatus = "idle" | "locating" | "success" | "error"

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 10_000,
}
const LOCATION_REQUEST_WATCHDOG_MS = 20_000

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Allow location access and try again."
  }

  if (error.code === error.TIMEOUT) {
    return "Finding your location took too long. Try again."
  }

  return "Your location is currently unavailable. Try again."
}

export function useCurrentLocation() {
  const [status, setStatus] = useState<CurrentLocationStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const isRequestInFlightRef = useRef(false)
  const requestIdRef = useRef(0)
  const watchdogRef = useRef<number | null>(null)

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current === null) return

    window.clearTimeout(watchdogRef.current)
    watchdogRef.current = null
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      clearWatchdog()
    }
  }, [clearWatchdog])

  const clearError = useCallback(() => setError(null), [])

  const requestLocation = useCallback(
    (onLocated: (position: MapPosition) => void) => {
      if (isRequestInFlightRef.current) return

      if (!navigator.geolocation) {
        setStatus("error")
        setError("Location is not supported by this browser.")
        return
      }

      setStatus("locating")
      setError(null)
      isRequestInFlightRef.current = true
      requestIdRef.current += 1
      const requestId = requestIdRef.current

      clearWatchdog()
      watchdogRef.current = window.setTimeout(() => {
        if (!isMountedRef.current || requestId !== requestIdRef.current) return

        requestIdRef.current += 1
        isRequestInFlightRef.current = false
        watchdogRef.current = null
        setStatus("error")
        setError("Location permission is taking too long. Try again.")
      }, LOCATION_REQUEST_WATCHDOG_MS)

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (requestId !== requestIdRef.current) return

          clearWatchdog()
          isRequestInFlightRef.current = false
          if (!isMountedRef.current) return

          const position = {
            lat: coords.latitude,
            lng: coords.longitude,
          }

          setStatus("success")
          onLocated(position)
        },
        (geolocationError) => {
          if (requestId !== requestIdRef.current) return

          clearWatchdog()
          isRequestInFlightRef.current = false
          if (!isMountedRef.current) return

          setStatus("error")
          setError(getGeolocationErrorMessage(geolocationError))
        },
        GEOLOCATION_OPTIONS,
      )
    },
    [clearWatchdog],
  )

  return {
    status,
    error,
    clearError,
    requestLocation,
  }
}
