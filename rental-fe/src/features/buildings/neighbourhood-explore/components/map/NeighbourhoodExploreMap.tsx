import { memo, useMemo } from "react"
import { AdvancedMarker, Circle, Map } from "@vis.gl/react-google-maps"

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
import { useGoogleMapsLoadState } from "@/features/map-search/hooks/useGoogleMapsLoadState"

import { useNeighbourhoodExplore } from "../../NeighbourhoodExploreContext"
import { NEIGHBOURHOOD_MAP_STYLES } from "../../constants/neighbourhoodMapStyles"
import { NeighbourhoodOriginMarker } from "./NeighbourhoodOriginMarker"
import { NeighbourhoodPlaceMarker } from "./NeighbourhoodPlaceMarker"

const NeighbourhoodExploreMapContent = memo(
  function NeighbourhoodExploreMapContent() {
    const {
      origin,
      visiblePlaces,
      radiusMeters,
      selectedPlaceId,
      selectPlace,
    } = useNeighbourhoodExplore()

    const center = useMemo(() => {
      if (!origin || !isValidMapPosition(origin)) {
        return { lat: 13.7653, lng: 100.642 }
      }

      return origin
    }, [origin])

    const zoom = getNearbyZoom(radiusMeters)
    const validPlaces = useMemo(
      () =>
        visiblePlaces.filter(
          (place) =>
            isValidMapPosition({ lat: place.lat, lng: place.lng }) &&
            Number.isFinite(place.distanceMeters),
        ),
      [visiblePlaces],
    )
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

        <AdvancedMarker position={origin} zIndex={50} title="Building">
          <NeighbourhoodOriginMarker />
        </AdvancedMarker>

        {validPlaces.map((place) => {
          const position = { lat: place.lat, lng: place.lng }
          const isSelected = place.id === selectedPlaceId

          return (
            <AdvancedMarker
              key={place.id}
              position={position}
              zIndex={isSelected ? 40 : 30}
              title={place.name}
            >
              <NeighbourhoodPlaceMarker
                place={place}
                isSelected={isSelected}
                onSelect={() => selectPlace(place.id)}
              />
            </AdvancedMarker>
          )
        })}
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
