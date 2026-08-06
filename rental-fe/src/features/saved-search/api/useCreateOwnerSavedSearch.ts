import { useMutation } from "@tanstack/react-query"

import {
  createOwnerSavedSearch,
  type CreateOwnerSavedSearchInput,
} from "./createOwnerSavedSearch"
import type { SavedSearch } from "./savedSearchParsers"

export const CREATE_OWNER_SAVED_SEARCH_SCOPE_ID =
  "create-owner-saved-search"

/**
 * Creates an owner saved search.
 *
 * Intentionally leaves React Query cache alone — no setQueryData,
 * invalidateQueries, or cancelQueries. Callers own any follow-up refetch
 * or navigation after success.
 */
export function useCreateOwnerSavedSearch() {
  return useMutation<SavedSearch, Error, CreateOwnerSavedSearchInput>({
    scope: { id: CREATE_OWNER_SAVED_SEARCH_SCOPE_ID },
    mutationFn: createOwnerSavedSearch,
  })
}
