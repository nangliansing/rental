import { memo, useCallback, useMemo } from "react"
import { AdvancedMarker, Circle, Map } from "@vis.gl/react-google-maps"

import { useGoogleMapsLoadState } from "@/features/map-search/hooks/useGoogleMapsLoadState"
import { getNearbyZoom } from "@/features/map-search/utils/map-camera"
import { isValidMapPosition } from "@/features/map-search/utils/map-position"
import { GoogleMapsApiProvider } from "@/shared/google-maps/GoogleMapsApiProvider"
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_MAP_ID,
  hasGoogleMapsApiKey,
  NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID,
  shouldUseClientMapStyles,
} from "@/shared/google-maps/googleMapsConfig"

import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import { useNeighbourhoodExploreData } from "../../NeighbourhoodExploreContext"
import { useNeighbourhoodExplorePlaceSelection } from "../../hooks/useNeighbourhoodExplorePlaceSelection"
import { NEIGHBOURHOOD_MAP_STYLES } from "../../constants/neighbourhoodMapStyles"
import { NeighbourhoodExploreMapPlaceSync } from "../sync/NeighbourhoodExploreMapPlaceSync"
import { NeighbourhoodOriginMarker } from "./NeighbourhoodOriginMarker"
import { NeighbourhoodPlaceMarker } from "./NeighbourhoodPlaceMarker"
import { NeighbourhoodPlaceMarkerSurface } from "./NeighbourhoodPlaceMarkerSurface"

const NEIGHBOURHOOD_PLACE_MARKER_ANCHOR = {
  anchorLeft: "-50%",
  anchorTop: "-100%",
} as const

type NeighbourhoodPlaceAdvancedMarkerProps = {
  place: NeighbourhoodPlace
  isSelected: boolean
  onSelect: (placeId: string) => void
}

const NeighbourhoodPlaceAdvancedMarker = memo(
  function NeighbourhoodPlaceAdvancedMarker({
    place,
    isSelected,
    onSelect,
  }: NeighbourhoodPlaceAdvancedMarkerProps) {
    const handleSelect = useCallback(() => {
      onSelect(place.id)
    }, [onSelect, place.id])

    return (
      <AdvancedMarker
        position={{ lat: place.lat, lng: place.lng }}
        zIndex={isSelected ? 40 : 30}
        title={place.name}
        clickable={false}
        {...NEIGHBOURHOOD_PLACE_MARKER_ANCHOR}
      >
        <NeighbourhoodPlaceMarkerSurface
          label={place.name}
          onSelect={handleSelect}
        >
          <NeighbourhoodPlaceMarker place={place} isSelected={isSelected} />
        </NeighbourhoodPlaceMarkerSurface>
      </AdvancedMarker>
    )
  },
)

const NeighbourhoodExploreMapPlaces = memo(function NeighbourhoodExploreMapPlaces() {
  const { visiblePlaces } = useNeighbourhoodExploreData()
  const { selectedPlaceId, selectPlace } = useNeighbourhoodExplorePlaceSelection()

  const validPlaces = useMemo(
    () =>
      visiblePlaces.filter(
        (place) =>
          isValidMapPosition({ lat: place.lat, lng: place.lng }) &&
          Number.isFinite(place.distanceMeters),
      ),
    [visiblePlaces],
  )

  return (
    <>
      {validPlaces.map((place) => (
        <NeighbourhoodPlaceAdvancedMarker
          key={place.id}
          place={place}
          isSelected={place.id === selectedPlaceId}
          onSelect={selectPlace}
        />
      ))}
    </>
  )
})

const NeighbourhoodExploreMapContent = memo(
  function NeighbourhoodExploreMapContent() {
    const { origin, radiusMeters } = useNeighbourhoodExploreData()

    const center = useMemo(() => {
      if (!origin || !isValidMapPosition(origin)) {
        return { lat: 13.7653, lng: 100.642 }
      }

      return origin
    }, [origin])

    const zoom = getNearbyZoom(radiusMeters)
    const clientMapStyles = shouldUseClientMapStyles(GOOGLE_MAPS_MAP_ID)
      ? NEIGHBOURHOOD_MAP_STYLES
      : undefined

    if (!origin || !isValidMapPosition(origin)) {
      return (
        <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-sm text-slate-500">
          Building location is unavailable.
        </div>
      )
    }

    return (
      <Map
        id={NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID}
        reuseMaps={false}
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={clientMapStyles}
        className="h-full w-full [&_.gm-style-cc]:opacity-70"
      >
        <Circle
          center={origin}
          radius={radiusMeters}
          fillColor="#3b82f6"
          fillOpacity={0.08}
          strokeColor="#3b82f6"
          strokeOpacity={0.35}
          strokeWeight={1.5}
          clickable={false}
        />

        <AdvancedMarker
          position={origin}
          zIndex={50}
          title="Building"
          clickable={false}
          {...NEIGHBOURHOOD_PLACE_MARKER_ANCHOR}
        >
          <NeighbourhoodOriginMarker />
        </AdvancedMarker>

        <NeighbourhoodExploreMapPlaces />
        <NeighbourhoodExploreMapPlaceSync />
      </Map>
    )
  },
)

type NeighbourhoodExploreMapFrameProps = {
  status: ReturnType<typeof useGoogleMapsLoadState>["status"]
}

function NeighbourhoodExploreMapFrame({
  status,
}: NeighbourhoodExploreMapFrameProps) {
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
        <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
          Map could not be loaded.
        </div>
      ) : (
        <NeighbourhoodExploreMapContent />
      )}
    </div>
  )
}

export function NeighbourhoodExploreMap() {
  const { status, markReady, markFailed } = useGoogleMapsLoadState(
    hasGoogleMapsApiKey(GOOGLE_MAPS_API_KEY),
  )

  if (!hasGoogleMapsApiKey(GOOGLE_MAPS_API_KEY)) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
        Map configuration is missing.
      </div>
    )
  }

  return (
    <GoogleMapsApiProvider onLoad={markReady} onError={markFailed}>
      <NeighbourhoodExploreMapFrame status={status} />
    </GoogleMapsApiProvider>
  )
}
