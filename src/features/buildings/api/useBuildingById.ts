import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getBuildingById } from "./getBuildingById"

export const buildingQueryKey = (buildingId: string | undefined) =>
  queryKeys.buildings.detail(buildingId)

type UseBuildingByIdInput = {
  buildingId?: string
  enabled?: boolean
}

export function useBuildingById({
  buildingId,
  enabled = true,
}: UseBuildingByIdInput) {
  return useQuery({
    queryKey: buildingQueryKey(buildingId),
    enabled: enabled && Boolean(buildingId),
    queryFn: () => getBuildingById(buildingId!),
  })
}
