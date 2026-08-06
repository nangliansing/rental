import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
} from "../api/createOwnerClientRequest"

export type ClientRequestDetailsValues = {
  name: string
  description: string
}

export type ClientRequestDetailsErrors = {
  name?: string
  description?: string
}

export type ValidatedClientRequestDetails = {
  name: string
  description: string | null
}

export function validateClientRequestDetails(
  values: ClientRequestDetailsValues,
):
  | { ok: true; value: ValidatedClientRequestDetails }
  | { ok: false; errors: ClientRequestDetailsErrors } {
  const errors: ClientRequestDetailsErrors = {}
  const trimmedName = values.name.trim()
  const trimmedDescription = values.description.trim()

  if (!trimmedName) {
    errors.name = "Enter a name for this search."
  } else if (trimmedName.length > CLIENT_REQUEST_NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters.`
  }

  if (trimmedDescription.length > CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`
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
