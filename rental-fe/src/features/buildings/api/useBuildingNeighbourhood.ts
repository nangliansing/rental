import { queryOptions, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  NEIGHBOURHOOD_FETCH_RADIUS_METERS,
} from "../constants/neighbourhood"
import { getBuildingNeighbourhood } from "./getBuildingNeighbourhood"

type BuildingNeighbourhoodQueryInput = {
  radiusM?: number
  fetchRadiusM?: number
}

export const buildingNeighbourhoodQueryKey = (
  buildingId: string | undefined,
  { radiusM, fetchRadiusM }: BuildingNeighbourhoodQueryInput = {},
) =>
  queryKeys.buildings.neighbourhood(buildingId, {
    radiusM: radiusM ?? NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
    fetchRadiusM: fetchRadiusM ?? NEIGHBOURHOOD_FETCH_RADIUS_METERS,
  })

export const buildingNeighbourhoodQueryOptions = ({
  buildingId,
  radiusM = NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  fetchRadiusM = NEIGHBOURHOOD_FETCH_RADIUS_METERS,
  enabled = true,
}: UseBuildingNeighbourhoodInput) =>
  queryOptions({
    queryKey: buildingNeighbourhoodQueryKey(buildingId, {
      radiusM,
      fetchRadiusM,
    }),
    enabled: enabled && Boolean(buildingId?.trim()),
    queryFn: ({ signal }) =>
      getBuildingNeighbourhood({
        buildingId: buildingId ?? "",
        radiusM,
        fetchRadiusM,
        signal,
      }),
  })

type UseBuildingNeighbourhoodInput = {
  buildingId?: string
  radiusM?: number
  fetchRadiusM?: number
  enabled?: boolean
}

export function useBuildingNeighbourhood({
  buildingId,
  radiusM = NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  fetchRadiusM = NEIGHBOURHOOD_FETCH_RADIUS_METERS,
  enabled = true,
}: UseBuildingNeighbourhoodInput) {
  return useQuery(
    buildingNeighbourhoodQueryOptions({
      buildingId,
      radiusM,
      fetchRadiusM,
      enabled,
    }),
  )
}
