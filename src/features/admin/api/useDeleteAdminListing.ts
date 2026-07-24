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

function patchAdminReportListing<T>(value: T, listingId: string, changes: object): T {
  if (Array.isArray(value)) {
    return value.map((item) =>
      patchAdminReportListing(item, listingId, changes),
    ) as T
  }
  if (!value || typeof value !== "object") return value

  const record = value as Record<string, unknown>
  let next: Record<string, unknown> = record
  if (record._id === listingId && "visibility" in record) {
    next = { ...record, ...changes, isDeleted: true, visibility: "PRIVATE" }
  }
  for (const [key, child] of Object.entries(next)) {
    const patched = patchAdminReportListing(child, listingId, changes)
    if (patched === child) continue
    if (next === record) next = { ...record }
    next[key] = patched
  }
  return next as T
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
      queryClient.setQueriesData(
        { queryKey: queryKeys.admin.reports.lists },
        (current: unknown) =>
          patchAdminReportListing(current, listingId, {}),
      )
      queryClient.setQueryData(
        queryKeys.admin.reports.detail(variables.reportId),
        (current: unknown) =>
          patchAdminReportListing(current, listingId, {}),
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
        queryClient.setQueriesData(
          { queryKey: queryKeys.admin.reports.lists },
          (current: unknown) =>
            patchAdminReportListing(current, variables.listingId, listing),
        )
        queryClient.setQueryData(
          queryKeys.admin.reports.detail(variables.reportId),
          (current: unknown) =>
            patchAdminReportListing(current, variables.listingId, listing),
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
