import { queryOptions, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getBuildingById } from "./getBuildingById"

export const buildingQueryKey = (buildingId: string | undefined) =>
  queryKeys.buildings.detail(buildingId)

export const buildingQueryOptions = (
  buildingId?: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: buildingQueryKey(buildingId),
    enabled: enabled && Boolean(buildingId?.trim()),
    queryFn: ({ signal }) => getBuildingById(buildingId ?? "", signal),
  })

type UseBuildingByIdInput = {
  buildingId?: string
  enabled?: boolean
}

export function useBuildingById({
  buildingId,
  enabled = true,
}: UseBuildingByIdInput) {
  return useQuery(buildingQueryOptions(buildingId, enabled))
}
