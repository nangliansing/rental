import { queryOptions, useQuery } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import { REVERSE_GEOCODE_GC_TIME_MS, REVERSE_GEOCODE_STALE_TIME_MS } from "../constants"
import { readReverseGeocodeCoordinates } from "../utils/reverseGeocodeCoordinates"
import { reverseGeocode } from "./reverseGeocode"

export type UseReverseGeocodeInput = {
  lat?: number | null
  lng?: number | null
  /** When false, the query stays idle until coordinates are needed. */
  enabled?: boolean
}

export const reverseGeocodeQueryKey = (lat: number, lng: number) =>
  queryKeys.geocode.reverse(lat, lng)

const shouldRetryReverseGeocode = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError) {
    if (
      error.code === "GEOCODE_NOT_FOUND" ||
      error.code === "RATE_LIMIT_EXCEEDED" ||
      error.code === "GEOCODE_NOT_CONFIGURED"
    ) {
      return false
    }

    if (error.code === "GEOCODE_UNAVAILABLE") {
      return failureCount === 0
    }

    return false
  }

  return failureCount < 1
}

export const reverseGeocodeQueryOptions = ({
  lat,
  lng,
  enabled = true,
}: UseReverseGeocodeInput = {}) => {
  const coordinates = readReverseGeocodeCoordinates(lat, lng)

  return queryOptions({
    queryKey: coordinates
      ? reverseGeocodeQueryKey(coordinates.lat, coordinates.lng)
      : queryKeys.geocode.invalid,
    enabled: enabled && coordinates !== null,
    queryFn: ({ signal }) => {
      if (!coordinates) {
        throw new ApiError(
          "Valid latitude and longitude are required.",
          422,
          "VALIDATION_ERROR",
        )
      }

      return reverseGeocode({
        lat: coordinates.lat,
        lng: coordinates.lng,
        signal,
      })
    },
    staleTime: REVERSE_GEOCODE_STALE_TIME_MS,
    gcTime: REVERSE_GEOCODE_GC_TIME_MS,
    retry: shouldRetryReverseGeocode,
    throwOnError: false,
  })
}

/**
 * Resolves coordinates to a formatted address through the authenticated
 * backend geocode proxy. Query keys use rounded coordinates so nearby points
 * share cache entries and avoid duplicate Google lookups.
 */
export function useReverseGeocode({
  lat,
  lng,
  enabled = true,
}: UseReverseGeocodeInput = {}) {
  const query = useQuery(
    reverseGeocodeQueryOptions({
      lat,
      lng,
      enabled,
    }),
  )

  const isNotFound =
    query.error instanceof ApiError && query.error.code === "GEOCODE_NOT_FOUND"

  return {
    ...query,
    formattedAddress: query.data?.formattedAddress ?? null,
    isNotFound,
  }
}
