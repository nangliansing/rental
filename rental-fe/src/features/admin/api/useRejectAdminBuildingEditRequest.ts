import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  captureBuildingEditRequestCache,
  createOptimisticBuildingEditTransition,
  findBuildingEditRequest,
  invalidateBuildingEditRequestCache,
  restoreBuildingEditRequestCache,
  updateBuildingEditRequestCache,
} from "./adminBuildingEditRequestCache"
import {
  rejectAdminBuildingEditRequest,
  type RejectAdminBuildingEditRequestInput,
} from "./rejectAdminBuildingEditRequest"

export function useRejectAdminBuildingEditRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "reject-admin-building-edit-request" },
    mutationFn: (input: RejectAdminBuildingEditRequestInput) =>
      rejectAdminBuildingEditRequest(input),
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
        const optimisticRequest = createOptimisticBuildingEditTransition(
          currentRequest,
          "REJECTED",
          input.reviewReason,
        )
        updateBuildingEditRequestCache(
          queryClient,
          snapshot,
          optimisticRequest,
        )
      }

      return { snapshot }
    },
    onError: (_error, _input, context) => {
      if (context) {
        restoreBuildingEditRequestCache(queryClient, context.snapshot)
      }
    },
    onSuccess: async (rejectedRequest, _input, context) => {
      updateBuildingEditRequestCache(
        queryClient,
        context?.snapshot ??
          (await captureBuildingEditRequestCache(
            queryClient,
            rejectedRequest._id,
          )),
        rejectedRequest,
      )
    },
    onSettled: async (request, error, input) => {
      if (error) return

      const requestId = request?._id ?? input.buildingEditRequestId.trim()
      await invalidateBuildingEditRequestCache(queryClient, requestId)
    },
  })
}
