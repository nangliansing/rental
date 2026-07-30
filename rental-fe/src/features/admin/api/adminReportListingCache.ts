import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { updateDeepInQueries } from "@/lib/query-state"

const isAdminReportListing =
  (listingId: string) =>
  (value: Record<string, unknown>) =>
    value._id === listingId && "visibility" in value

function definedChanges(changes: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  )
}

/**
 * Marks every embedded admin-report listing projection deleted and private.
 * Uses the defensive deep patch layer: never throws, copy-on-write, atomic.
 */
export function patchAdminReportListingInQueries(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
  listingId: string,
  changes: Record<string, unknown> = {},
) {
  const patch = definedChanges(changes)

  updateDeepInQueries(
    queryClient,
    keys,
    isAdminReportListing(listingId),
    (current) => ({
      ...current,
      ...patch,
      isDeleted: true,
      visibility: "PRIVATE",
    }),
  )
}
