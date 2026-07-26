import { memo, useMemo } from "react"
import {
  AdvancedMarker,
  APIProvider,
  Circle,
  Map,
} from "@vis.gl/react-google-maps"

import { useGoogleMapsLoadState } from "@/features/map-search/hooks/useGoogleMapsLoadState"
import { getNearbyZoom } from "@/features/map-search/utils/map-camera"
import { isValidMapPosition } from "@/features/map-search/utils/map-position"

import { useNeighbourhoodExplore } from "../../NeighbourhoodExploreContext"
import { NEIGHBOURHOOD_MAP_STYLES } from "../../constants/neighbourhoodMapStyles"
import { NeighbourhoodOriginMarker } from "./NeighbourhoodOriginMarker"
import { NeighbourhoodPlaceMarker } from "./NeighbourhoodPlaceMarker"

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ""
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"

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

    if (!origin || !isValidMapPosition(origin)) {
      return (
        <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-sm text-slate-500">
          Building location is unavailable.
        </div>
      )
    }

    return (
      <Map
        mapId={mapId}
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        styles={NEIGHBOURHOOD_MAP_STYLES}
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

export function NeighbourhoodExploreMap() {
  const hasApiKey = Boolean(apiKey)
  const { status, markReady, markFailed } = useGoogleMapsLoadState(hasApiKey)

  if (!hasApiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
        Map configuration is missing.
      </div>
    )
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={["places"]}
      onLoad={markReady}
      onError={markFailed}
    >
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
    </APIProvider>
  )
}
