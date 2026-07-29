import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ADMIN_BUILDING_EDIT_REQUEST_WRITE_SCOPE_ID } from "./adminBuildingEditRequestCache"
import { createAdminBuildingEditRequestTransaction } from "./adminBuildingEditRequestTransaction"
import {
  rejectAdminBuildingEditRequest,
  type RejectAdminBuildingEditRequestInput,
} from "./rejectAdminBuildingEditRequest"
import type { AdminBuildingEditRequest } from "./buildingEditRequestTypes"

export function useRejectAdminBuildingEditRequest() {
  const queryClient = useQueryClient()
  const transaction = createAdminBuildingEditRequestTransaction<
    AdminBuildingEditRequest,
    RejectAdminBuildingEditRequestInput
  >({
    queryClient,
    status: "REJECTED",
    getReviewReason: (input) => input.reviewReason,
    getRequest: (request) => request,
  })

  return useMutation({
    scope: { id: ADMIN_BUILDING_EDIT_REQUEST_WRITE_SCOPE_ID },
    mutationFn: (input: RejectAdminBuildingEditRequestInput) =>
      rejectAdminBuildingEditRequest(input),
    ...transaction,
  })
}
