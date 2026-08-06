import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
} from "../api/createOwnerSavedSearch"

export type SavedSearchDetailsValues = {
  name: string
  description: string
}

export type SavedSearchDetailsErrors = {
  name?: string
  description?: string
}

export type ValidatedSavedSearchDetails = {
  name: string
  description: string | null
}

export function validateSavedSearchDetails(
  values: SavedSearchDetailsValues,
):
  | { ok: true; value: ValidatedSavedSearchDetails }
  | { ok: false; errors: SavedSearchDetailsErrors } {
  const errors: SavedSearchDetailsErrors = {}
  const trimmedName = values.name.trim()
  const trimmedDescription = values.description.trim()

  if (!trimmedName) {
    errors.name = "Enter a name for this search."
  } else if (trimmedName.length > SAVED_SEARCH_NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters.`
  }

  if (trimmedDescription.length > SAVED_SEARCH_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Notes must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters.`
  }

  if (errors.name || errors.description) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      name: trimmedName,
      description: trimmedDescription || null,
    },
  }
}
