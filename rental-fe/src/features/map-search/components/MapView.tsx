import { AlertTriangle, MapPin, RotateCw } from "lucide-react"
import { memo, useCallback, useEffect, useRef } from "react"
import {
  AdvancedMarker,
  Map,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps"

import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_MAP_ID,
  hasGoogleMapsApiKey,
  MAP_SEARCH_MAP_INSTANCE_ID,
} from "@/shared/google-maps/googleMapsConfig"
import { GoogleMapsApiProvider } from "@/shared/google-maps/GoogleMapsApiProvider"

import { PlaceSearch } from "./place-search/PlaceSearch"
import { useMapSearchCanvas } from "../context/MapSearchSessionContext"
import { useMapInteraction } from "../context/MapInteractionContext"
import type { MapPosition } from "../types"
import { SearchAreaButton } from "./SearchAreaButton"
import { useGoogleMapsLoadState } from "../hooks/useGoogleMapsLoadState"
import type { SearchBuilding } from "../types"
import { getKeyboardMovedPin } from "../utils/move-map-pin"
import type { SearchBounds } from "../hooks/useMapBounds"
import { BuildingMarkerLayer } from "./BuildingMarkerLayer"
import { MapCameraRestorer } from "./map/MapCameraRestorer"
import {
  AreaPlaceMarker,
  LineSearchOverlays,
  PinRadiusOverlay,
} from "./map/MapSearchOverlays"
import { getNearbyZoom } from "../utils/map-camera"
import { isValidMapPosition } from "../utils/map-position"

const DEFAULT_MAP_CENTER = { lat: 13.7653, lng: 100.642 }

function getBoundsCenter(bounds: SearchBounds) {
  return {
    lat: (bounds.northEast.lat + bounds.southWest.lat) / 2,
    lng: (bounds.northEast.lng + bounds.southWest.lng) / 2,
  }
}

function getPositionFromEvent(event: unknown): MapPosition | null {
  const mapEvent = event as {
    detail?: {
      latLng?: {
        lat: number
        lng: number
      }
    }
    latLng?: google.maps.LatLng | null
  }

  if (mapEvent.detail?.latLng) {
    return isValidMapPosition(mapEvent.detail.latLng)
      ? mapEvent.detail.latLng
      : null
  }

  if (mapEvent.latLng) {
    const position = {
      lat: mapEvent.latLng.lat(),
      lng: mapEvent.latLng.lng(),
    }
    return isValidMapPosition(position) ? position : null
  }

  return null
}

function MapStatusOverlay({ status }: { status: "loading" | "ready" }) {
  if (status === "ready") return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/85 text-sm font-medium text-slate-600 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      Loading map...
    </div>
  )
}

function MapUnavailableState({ hasApiKey }: { hasApiKey: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 px-6">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg ring-1 ring-slate-200">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-amber-500"
        />
        <h1 className="mt-3 text-lg font-semibold text-slate-950">
          Map temporarily unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {hasApiKey
            ? "You can still search for agents or review any loaded results while we reconnect."
            : "Map configuration is missing. Please contact support or try again later."}
        </p>
        {hasApiKey && (
          <button
            type="button"
            className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => window.location.reload()}
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            Retry map
          </button>
        )}
      </div>
    </div>
  )
}

export const MapView = memo(function MapView() {
  const {
    searchedPlace,
    buildings,
    selectedBuilding,
    nearbyRadiusMeters,
    linePoints,
    lineDistanceMeters,
    committedBounds,
    cameraRestoreVersion,
    isPlaceSearchOpen,
    isListingSearch,
    onBuildingSelect,
    onPinChange,
    onAddLinePoint,
    onMapMove,
  } = useMapSearchCanvas()
  const { mode, selectedPin, currentLocation } = useMapInteraction()
  const [pinMarkerRef, pinMarker] = useAdvancedMarkerRef()
  const isProgrammaticCameraMoveRef = useRef(cameraRestoreVersion > 0)
  const hasApiKey = hasGoogleMapsApiKey(GOOGLE_MAPS_API_KEY)
  const { status, markReady, markFailed } = useGoogleMapsLoadState(hasApiKey)

  const handleMapClick = useCallback((event: unknown) => {
    const position = getPositionFromEvent(event)

    if (position && mode === "line") {
      onAddLinePoint(position)
    } else if (position && selectedPin) {
      onPinChange(position)
    }
  }, [mode, onAddLinePoint, onPinChange, selectedPin])

  const handlePinDragEnd = useCallback((event: unknown) => {
    const position = getPositionFromEvent(event)

    if (position) {
      onPinChange(position)
    }
  }, [onPinChange])

  useEffect(() => {
    const markerElement = pinMarker?.element
    if (!markerElement || !selectedPin) return

    const handlePinKeyDown = (event: KeyboardEvent) => {
      if (!selectedPin) return

      const nextPosition = getKeyboardMovedPin(
        selectedPin,
        event.key,
        event.shiftKey,
      )
      if (!nextPosition) return

      event.preventDefault()
      onPinChange(nextPosition)
    }

    markerElement.addEventListener("keydown", handlePinKeyDown)
    return () => markerElement.removeEventListener("keydown", handlePinKeyDown)
  }, [onPinChange, pinMarker, selectedPin])

  const handleBuildingSelect = useCallback(
    (building: SearchBuilding) => onBuildingSelect(building),
    [onBuildingSelect],
  )
  const handleCameraRestoreStart = useCallback(() => {
    isProgrammaticCameraMoveRef.current = true
  }, [])
  const handleZoomChanged = useCallback(() => {
    if (!isProgrammaticCameraMoveRef.current) onMapMove()
  }, [onMapMove])
  const handleMapIdle = useCallback(() => {
    isProgrammaticCameraMoveRef.current = false
  }, [])

  const defaultCenter = selectedPin
    ? selectedPin
    : committedBounds
      ? getBoundsCenter(committedBounds)
      : DEFAULT_MAP_CENTER
  const defaultZoom = selectedPin ? getNearbyZoom(nearbyRadiusMeters) : 15
  if (!hasApiKey) return <MapUnavailableState hasApiKey={false} />

  return (
    <GoogleMapsApiProvider onError={markFailed}>
      {status === "error" ? (
        <MapUnavailableState hasApiKey />
      ) : (
        <>
          <Map
            id={MAP_SEARCH_MAP_INSTANCE_ID}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            gestureHandling="greedy"
            disableDefaultUI
            mapId={GOOGLE_MAPS_MAP_ID}
            className="h-full w-full"
            onClick={handleMapClick}
            onDragstart={onMapMove}
            onZoomChanged={handleZoomChanged}
            onIdle={handleMapIdle}
            onTilesLoaded={markReady}
          />
          <MapCameraRestorer
            restoreVersion={cameraRestoreVersion}
            bounds={committedBounds}
            pin={selectedPin}
            radiusMeters={nearbyRadiusMeters}
            selectedBuilding={selectedBuilding}
            onRestoreStart={handleCameraRestoreStart}
          />
          <MapStatusOverlay status={status} />

          <BuildingMarkerLayer
            buildings={buildings}
            isListingSearch={isListingSearch}
            onSelect={handleBuildingSelect}
          />

          {mode === "line" && (
            <LineSearchOverlays
              points={linePoints}
              distanceMeters={lineDistanceMeters}
            />
          )}

          {mode === "area" && searchedPlace && (
            <AreaPlaceMarker place={searchedPlace} />
          )}

          {mode === "pin" && selectedPin && (
            <PinRadiusOverlay
              position={selectedPin}
              radiusMeters={nearbyRadiusMeters}
            />
          )}

          {mode === "pin" && selectedPin && (
        <AdvancedMarker
          ref={pinMarkerRef}
          position={selectedPin}
          zIndex={30}
          draggable
          clickable
          title="Move search pin. Use arrow keys for small steps or Shift plus arrow keys for larger steps."
          onDragEnd={handlePinDragEnd}
        >
          <div className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            {currentLocation ? (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg"
                aria-hidden="true"
              >
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 ring-4 ring-blue-500/25" />
              </span>
            ) : (
              <span className="relative flex flex-col items-center" aria-hidden="true">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg ring-4 ring-rose-100">
                  <MapPin className="h-6 w-6" />
                </span>
                <span className="h-3 w-0.5 bg-rose-600" />
                <span className="h-2 w-2 rounded-full bg-rose-600 shadow" />
              </span>
            )}
          </div>
        </AdvancedMarker>
          )}

          {!isPlaceSearchOpen && <SearchAreaButton />}
        </>
      )}

      <PlaceSearch />
    </GoogleMapsApiProvider>
  )
})
