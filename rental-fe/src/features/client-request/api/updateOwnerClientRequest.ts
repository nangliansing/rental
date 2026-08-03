import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseClientRequestFilters,
  parseGetOwnerClientRequestByIdResponse,
  type ClientRequest,
  type ClientRequestFilters,
  type ClientRequestGeoSearch,
} from "./clientRequestParsers"
import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
  buildCreateOwnerClientRequestGeoSearch,
} from "./createOwnerClientRequest"

const UPDATE_FIELDS = new Set([
  "name",
  "description",
  "geoSearch",
  "filters",
])

export type UpdateOwnerClientRequestValues = {
  name?: string
  description?: string | null
  geoSearch?: ClientRequestGeoSearch
  filters?: ClientRequestFilters
}

export type UpdateOwnerClientRequestInput = {
  clientRequestId: string
} & UpdateOwnerClientRequestValues

const validationError = (message: string) =>
  new ApiError(message, 422, "VALIDATION_ERROR")

export const buildUpdateOwnerClientRequestPayload = (
  input: UpdateOwnerClientRequestValues,
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

    if (name.length > CLIENT_REQUEST_NAME_MAX_LENGTH) {
      throw validationError(
        `name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters.`,
      )
    }

    body.name = name
  }

  if (input.description !== undefined) {
    if (input.description === null) {
      body.description = null
    } else {
      const description = input.description.trim()

      if (description.length > CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH) {
        throw validationError(
          `description must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
        )
      }

      body.description = description || null
    }
  }

  if (input.geoSearch !== undefined) {
    body.geoSearch = buildCreateOwnerClientRequestGeoSearch(input.geoSearch)
  }

  if (input.filters !== undefined) {
    body.filters = parseClientRequestFilters(input.filters)
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

export async function updateOwnerClientRequest({
  clientRequestId,
  ...values
}: UpdateOwnerClientRequestInput): Promise<ClientRequest> {
  const normalizedClientRequestId = clientRequestId.trim()

  if (!normalizedClientRequestId) {
    throw validationError("Client request id is required.")
  }

  const response = await apiClient.patch<unknown>(
    `/client-requests/${encodeURIComponent(normalizedClientRequestId)}`,
    buildUpdateOwnerClientRequestPayload(values),
  )

  return parseGetOwnerClientRequestByIdResponse(response.data).data
}
