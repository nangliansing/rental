import { memo, useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import {
  AdvancedMarker,
  useMap,
  type AdvancedMarkerRef,
} from "@vis.gl/react-google-maps"
import { MarkerClusterer, type Renderer } from "@googlemaps/markerclusterer"

import { cn } from "@/lib/utils"

import { useMapSearchMarkerHighlight } from "../context/MapSearchMarkerHighlightContext"
import type { SearchBuilding } from "../types"
import { formatBuildingMarkerLabel } from "../utils/building-display"
import { getPositionFromBuildingLocation } from "../utils/map-position"
import { BuildingMarkerButton } from "./building-marker/BuildingMarkerButton"

export function getBuildingMarkerClassName({
  isSelected = false,
  isHovered = false,
  isListingOnly = false,
}: {
  isSelected?: boolean
  isHovered?: boolean
  isListingOnly?: boolean
}) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-semibold shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
    isSelected
      ? "scale-110 border-slate-950 bg-slate-950 text-white shadow-lg ring-4 ring-slate-300/70"
      : isHovered
        ? "border-slate-950 bg-slate-950 text-white"
        : isListingOnly
          ? "border-slate-200 bg-white text-slate-600"
          : "border-slate-900 bg-white text-slate-950",
  )
}

const clusterRenderer: Renderer = {
  render({ count, position }) {
    const content = document.createElement("div")
    content.className =
      "flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-white bg-slate-950 px-2 text-sm font-bold text-white shadow-lg"
    content.textContent = String(count)
    content.setAttribute("aria-hidden", "true")

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content,
      title: `${count} buildings. Activate to zoom in.`,
      zIndex: 15,
    })
  },
}

const ProminentBuildingMarker = memo(function ProminentBuildingMarker({
  building,
  isSelected,
  isHovered,
  isListingOnly,
  onSelect,
}: {
  building: SearchBuilding
  isSelected: boolean
  isHovered: boolean
  isListingOnly: boolean
  onSelect: (building: SearchBuilding) => void
}) {
  const position = getPositionFromBuildingLocation(building.location)
  if (!building._id?.trim() || !position) return null

  return (
    <AdvancedMarker position={position} zIndex={isSelected ? 40 : 30}>
      <BuildingMarkerButton
        isSelected={isSelected}
        isHovered={isHovered}
        isListingOnly={isListingOnly}
        ariaPressed={isSelected || undefined}
        ariaCurrent={isSelected || undefined}
        onSelect={() => onSelect(building)}
      >
        {isListingOnly ? "List here" : formatBuildingMarkerLabel(building)}
      </BuildingMarkerButton>
    </AdvancedMarker>
  )
})

const BuildingMarker = memo(function BuildingMarker({
  building,
  isListingOnly,
  onSelect,
  onMarkerChange,
}: {
  building: SearchBuilding
  isListingOnly: boolean
  onSelect: (building: SearchBuilding) => void
  onMarkerChange: (id: string, marker: AdvancedMarkerRef) => void
}) {
  const position = getPositionFromBuildingLocation(building.location)
  const markerRef = useCallback(
    (marker: AdvancedMarkerRef) => onMarkerChange(building._id, marker),
    [building._id, onMarkerChange],
  )
  if (!building._id?.trim() || !position) return null

  return (
    <AdvancedMarker ref={markerRef} position={position} zIndex={10}>
      <BuildingMarkerButton
        isListingOnly={isListingOnly}
        onSelect={() => onSelect(building)}
      >
        {isListingOnly ? "List here" : formatBuildingMarkerLabel(building)}
      </BuildingMarkerButton>
    </AdvancedMarker>
  )
})

export function getProminentBuildings({
  buildings,
  selectedBuildingId,
  hoveredBuildingId,
}: {
  buildings: SearchBuilding[]
  selectedBuildingId: string | null
  hoveredBuildingId: string | null
}) {
  const buildingById = new Map(buildings.map((building) => [building._id, building]))
  const prominentIds = new Set<string>()
  if (selectedBuildingId) prominentIds.add(selectedBuildingId)
  if (hoveredBuildingId) prominentIds.add(hoveredBuildingId)

  return [...prominentIds]
    .map((id) => buildingById.get(id) ?? null)
    .filter((building): building is SearchBuilding => building !== null)
}

export const BuildingMarkerLayer = memo(function BuildingMarkerLayer({
  buildings,
  isListingSearch,
  onSelect,
}: {
  buildings: SearchBuilding[]
  isListingSearch: boolean
  onSelect: (building: SearchBuilding) => void
}) {
  const map = useMap()
  const { hoveredBuildingId, selectedBuildingId } = useMapSearchMarkerHighlight()
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef(
    new Map<string, google.maps.marker.AdvancedMarkerElement>(),
  )
  const [markersVersion, bumpMarkersVersion] = useReducer(
    (version: number) => version + 1,
    0,
  )

  const prominentBuildings = useMemo(
    () =>
      getProminentBuildings({
        buildings,
        selectedBuildingId,
        hoveredBuildingId,
      }),
    [buildings, hoveredBuildingId, selectedBuildingId],
  )

  const prominentIds = useMemo(
    () => new Set(prominentBuildings.map((building) => building._id)),
    [prominentBuildings],
  )

  const clusterableBuildings = useMemo(
    () => buildings.filter((building) => !prominentIds.has(building._id)),
    [buildings, prominentIds],
  )

  const setMarkerRef = useCallback((id: string, marker: AdvancedMarkerRef) => {
    const markers = markersRef.current
    const existing = markers.get(id)
    if (existing === marker || (!existing && !marker)) return

    if (marker) markers.set(id, marker)
    else markers.delete(id)
    bumpMarkersVersion()
  }, [])

  useEffect(() => {
    if (!map) return
    const clusterer = new MarkerClusterer({ map, renderer: clusterRenderer })
    clustererRef.current = clusterer

    return () => {
      clusterer.clearMarkers()
      clustererRef.current = null
    }
  }, [map])

  useEffect(() => {
    const clusterer = clustererRef.current
    if (!clusterer || !map) return

    clusterer.clearMarkers(true)
    clusterer.addMarkers([...markersRef.current.values()])

    return () => clusterer.clearMarkers(true)
  }, [map, markersVersion])

  return (
    <>
      {prominentBuildings.map((building) => {
        const isSelected = selectedBuildingId === building._id
        const isHovered = hoveredBuildingId === building._id
        const isListingOnly =
          isListingSearch && building.listings.length === 0

        return (
          <ProminentBuildingMarker
            key={building._id}
            building={building}
            isSelected={isSelected}
            isHovered={isHovered}
            isListingOnly={isListingOnly}
            onSelect={onSelect}
          />
        )
      })}

      {clusterableBuildings.map((building) => {
        const isListingOnly =
          isListingSearch && building.listings.length === 0

        return (
          <BuildingMarker
            key={building._id}
            building={building}
            isListingOnly={isListingOnly}
            onSelect={onSelect}
            onMarkerChange={setMarkerRef}
          />
        )
      })}
    </>
  )
})
