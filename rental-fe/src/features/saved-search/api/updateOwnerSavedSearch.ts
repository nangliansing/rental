import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseSavedSearchFilters,
  parseGetOwnerSavedSearchByIdResponse,
  type SavedSearch,
  type SavedSearchFilters,
  type SavedSearchGeoSearch,
} from "./savedSearchParsers"
import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
  buildCreateOwnerSavedSearchGeoSearch,
} from "./createOwnerSavedSearch"

const UPDATE_FIELDS = new Set([
  "name",
  "description",
  "geoSearch",
  "filters",
])

export type UpdateOwnerSavedSearchValues = {
  name?: string
  description?: string | null
  geoSearch?: SavedSearchGeoSearch
  filters?: SavedSearchFilters
}

export type UpdateOwnerSavedSearchInput = {
  savedSearchId: string
} & UpdateOwnerSavedSearchValues

const validationError = (message: string) =>
  new ApiError(message, 422, "VALIDATION_ERROR")

export const buildUpdateOwnerSavedSearchPayload = (
  input: UpdateOwnerSavedSearchValues,
) => {
  const unknownFields = Object.keys(input).filter(
    fieldName => !UPDATE_FIELDS.has(fieldName),
  )

  if (unknownFields.length) {
    throw validationError(`Unknown fields: ${unknownFields.join(", ")}`)
  }

  const body: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()

    if (!name) {
      throw validationError("name is required.")
    }

    if (name.length > SAVED_SEARCH_NAME_MAX_LENGTH) {
      throw validationError(
        `name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters.`,
      )
    }

    body.name = name
  }

  if (input.description !== undefined) {
    if (input.description === null) {
      body.description = null
    } else {
      const description = input.description.trim()

      if (description.length > SAVED_SEARCH_DESCRIPTION_MAX_LENGTH) {
        throw validationError(
          `description must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters.`,
        )
      }

      body.description = description || null
    }
  }

  if (input.geoSearch !== undefined) {
    body.geoSearch = buildCreateOwnerSavedSearchGeoSearch(input.geoSearch)
  }

  if (input.filters !== undefined) {
    body.filters = parseSavedSearchFilters(input.filters)
  }

  if (!Object.keys(body).length) {
    throw new ApiError(
      "Make at least one change before saving.",
      422,
      "NO_VALID_CHANGE",
    )
  }

  return body
}

export async function updateOwnerSavedSearch({
  savedSearchId,
  ...values
}: UpdateOwnerSavedSearchInput): Promise<SavedSearch> {
  const normalizedSavedSearchId = savedSearchId.trim()

  if (!normalizedSavedSearchId) {
    throw validationError("Saved search id is required.")
  }

  const response = await apiClient.patch<unknown>(
    `/saved-searches/${encodeURIComponent(normalizedSavedSearchId)}`,
    buildUpdateOwnerSavedSearchPayload(values),
  )

  return parseGetOwnerSavedSearchByIdResponse(response.data).data
}
