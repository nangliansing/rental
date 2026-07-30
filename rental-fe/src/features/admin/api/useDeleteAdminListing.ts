import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"

import {
  cancelRelatedListingQueries,
  captureRelatedListingQueries,
  invalidateListingCollections,
  optimisticallyDeleteListing,
  patchListingInRelatedQueries,
  removeDeletedListingDetails,
  restoreListingCacheSnapshot,
} from "@/features/listing/utils/listingMutationCache"
import { queryKeys } from "@/lib/query-keys"

import {
  deleteAdminListing,
  isAdminListingNotFoundError,
} from "./deleteAdminListing"
import { patchAdminReportListingInQueries } from "./adminReportListingCache"

export type DeleteAdminListingVariables = {
  agentProfileId?: string
  buildingId?: string
  listingId: string
  listingOwnerUserId?: string
  reason: string
  reportId: string
}

type ExtraSnapshot = Array<{ data: unknown; queryKey: QueryKey }>

function captureKeys(queryClient: ReturnType<typeof useQueryClient>, keys: QueryKey[]) {
  const captured = new Map<string, ExtraSnapshot[number]>()
  keys.forEach((queryKey) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => {
        captured.set(query.queryHash, {
          queryKey: query.queryKey,
          data: query.state.data,
        })
      })
  })
  return [...captured.values()]
}

export function useDeleteAdminListing(currentUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "delete-admin-listing" },
    mutationFn: async (variables: DeleteAdminListingVariables) => {
      try {
        return await deleteAdminListing({
          listingId: variables.listingId,
          reason: variables.reason,
        })
      } catch (error) {
        if (!isAdminListingNotFoundError(error)) throw error
        return null
      }
    },
    onMutate: async (variables) => {
      const listingId = variables.listingId.trim()
      const isOwnListing =
        Boolean(currentUserId) && variables.listingOwnerUserId === currentUserId
      const extraKeys: QueryKey[] = [
        queryKeys.admin.reports.lists,
        queryKeys.admin.reports.detail(variables.reportId),
        ...(variables.agentProfileId
          ? [queryKeys.profiles.detail(variables.agentProfileId)]
          : []),
        ...(isOwnListing ? [queryKeys.profiles.me] : []),
      ]

      await Promise.all([
        cancelRelatedListingQueries(queryClient, listingId),
        ...extraKeys.map((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        ),
      ])
      const listingSnapshot = captureRelatedListingQueries(
        queryClient,
        listingId,
      )
      const extraSnapshot = captureKeys(queryClient, extraKeys)

      optimisticallyDeleteListing(queryClient, listingId)
      patchAdminReportListingInQueries(
        queryClient,
        [
          queryKeys.admin.reports.lists,
          queryKeys.admin.reports.detail(variables.reportId),
        ],
        listingId,
      )

      return { extraSnapshot, isOwnListing, listingSnapshot }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreListingCacheSnapshot(queryClient, context.listingSnapshot)
      context.extraSnapshot.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data)
      })
    },
    onSuccess: (listing, variables) => {
      if (listing) {
        patchListingInRelatedQueries(queryClient, variables.listingId, listing)
        patchAdminReportListingInQueries(
          queryClient,
          [
            queryKeys.admin.reports.lists,
            queryKeys.admin.reports.detail(variables.reportId),
          ],
          variables.listingId,
          listing,
        )
      }
      removeDeletedListingDetails(queryClient, variables.listingId)
    },
    onSettled: async (_listing, error, variables, context) => {
      if (error) return

      const invalidations: QueryKey[] = [
        queryKeys.admin.reports.lists,
        queryKeys.admin.reports.detail(variables.reportId),
        ...(variables.agentProfileId
          ? [queryKeys.profiles.detail(variables.agentProfileId)]
          : []),
        ...(variables.buildingId
          ? [queryKeys.buildings.detail(variables.buildingId)]
          : []),
        ...(context?.isOwnListing ? [queryKeys.profiles.me] : []),
      ]

      await Promise.all([
        invalidateListingCollections(queryClient),
        ...invalidations.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
        ),
      ])
    },
  })
}
