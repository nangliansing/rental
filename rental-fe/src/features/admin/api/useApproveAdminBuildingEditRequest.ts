import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelRelatedBuildingQueries,
  invalidateRelatedBuildingQueries,
  patchBuildingInRelatedQueries,
} from "@/features/buildings/api/buildingMutationCache"

import {
  captureBuildingEditRequestCache,
  createOptimisticBuildingEditTransition,
  findBuildingEditRequest,
  invalidateBuildingEditRequestCache,
  restoreBuildingEditRequestCache,
  updateBuildingEditRequestCache,
} from "./adminBuildingEditRequestCache"
import {
  approveAdminBuildingEditRequest,
  type ApproveAdminBuildingEditRequestInput,
} from "./approveAdminBuildingEditRequest"

export function useApproveAdminBuildingEditRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "approve-admin-building-edit-request" },
    mutationFn: (input: ApproveAdminBuildingEditRequestInput) =>
      approveAdminBuildingEditRequest(input),
    onMutate: async (input) => {
      const requestId = input.buildingEditRequestId.trim()
      const snapshot = await captureBuildingEditRequestCache(
        queryClient,
        requestId,
      )
      const currentRequest = findBuildingEditRequest(
        snapshot.detailData,
        snapshot.listData,
        requestId,
      )

      if (currentRequest) {
        updateBuildingEditRequestCache(
          queryClient,
          snapshot,
          createOptimisticBuildingEditTransition(
            currentRequest,
            "APPROVED",
            input.reviewReason ?? "",
          ),
        )
      }

      return { snapshot }
    },
    onError: (_error, _input, context) => {
      if (context) {
        restoreBuildingEditRequestCache(queryClient, context.snapshot)
      }
    },
    onSuccess: async (result, _input, context) => {
      updateBuildingEditRequestCache(
        queryClient,
        context?.snapshot ??
          (await captureBuildingEditRequestCache(
            queryClient,
            result.request._id,
          )),
        result.request,
      )

      await cancelRelatedBuildingQueries(queryClient, result.building._id)
      patchBuildingInRelatedQueries(queryClient, result.building)
    },
    onSettled: async (result, error, input) => {
      if (error || !result) return

      await Promise.all([
        invalidateBuildingEditRequestCache(
          queryClient,
          result.request._id || input.buildingEditRequestId.trim(),
        ),
        invalidateRelatedBuildingQueries(queryClient, result.building._id),
      ])
    },
  })
}
