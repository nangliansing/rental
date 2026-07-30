import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelRelatedBuildingQueries,
  invalidateRelatedBuildingQueries,
  patchBuildingInRelatedQueries,
} from "@/features/buildings/api/buildingMutationCache"

import { ADMIN_BUILDING_EDIT_REQUEST_WRITE_SCOPE_ID } from "./adminBuildingEditRequestCache"
import { createAdminBuildingEditRequestTransaction } from "./adminBuildingEditRequestTransaction"
import {
  approveAdminBuildingEditRequest,
  type ApproveAdminBuildingEditRequestInput,
  type ApproveAdminBuildingEditRequestResult,
} from "./approveAdminBuildingEditRequest"

export function useApproveAdminBuildingEditRequest() {
  const queryClient = useQueryClient()
  const transaction = createAdminBuildingEditRequestTransaction<
    ApproveAdminBuildingEditRequestResult,
    ApproveAdminBuildingEditRequestInput
  >({
    queryClient,
    status: "APPROVED",
    getReviewReason: (input) => input.reviewReason ?? "",
    getRequest: (result) => result.request,
  })

  return useMutation({
    scope: { id: ADMIN_BUILDING_EDIT_REQUEST_WRITE_SCOPE_ID },
    mutationFn: (input: ApproveAdminBuildingEditRequestInput) =>
      approveAdminBuildingEditRequest(input),
    ...transaction,
    onSuccess: async (result, input, context) => {
      await transaction.onSuccess?.(result, input, context)
      await cancelRelatedBuildingQueries(queryClient, result.building._id)
      patchBuildingInRelatedQueries(queryClient, result.building)
    },
    onSettled: async (result, error, input, context) => {
      await transaction.onSettled(result, error, input, context)
      if (error || !result) return
      await invalidateRelatedBuildingQueries(queryClient, result.building._id)
    },
  })
}
