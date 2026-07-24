import { queryKeys } from "@/lib/query-keys"
import { useCreateModerationRecord } from "@/lib/use-create-moderation-record"

import {
  createBuildingEditRequest,
  type BuildingEditRequest,
  type CreateBuildingEditRequestInput,
} from "./createBuildingEditRequest"

export function useCreateBuildingEditRequest() {
  return useCreateModerationRecord<
    BuildingEditRequest,
    CreateBuildingEditRequestInput
  >({
    scopeId: "create-building-edit-request",
    queryKey: queryKeys.admin.buildingEditRequests.lists,
    mutationFn: createBuildingEditRequest,
  })
}
