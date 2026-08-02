import {
  readNumber,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"
import { ApiError, apiClient } from "@/lib/api-client"

import { readReverseGeocodeCoordinates } from "../utils/reverseGeocodeCoordinates"

export type ReverseGeocodeSource = "google"

export type ReverseGeocodeResult = {
  lat: number
  lng: number
  formattedAddress: string
  placeId: string | null
  source: ReverseGeocodeSource
  cached: boolean
  fetchedAt: string
}

export type ReverseGeocodeInput = {
  lat: number
  lng: number
  signal?: AbortSignal
}

type ReverseGeocodeResponse = {
  success: true
  data: ReverseGeocodeResult
}

const INVALID_REVERSE_GEOCODE_RESPONSE = "INVALID_REVERSE_GEOCODE_RESPONSE"

function parseReverseGeocodeResult(value: unknown): ReverseGeocodeResult {
  const result = readRecord(value)
  const lat = readNumber(result.lat)
  const lng = readNumber(result.lng)
  const formattedAddress = readString(result.formattedAddress)
  const placeId = readString(result.placeId)
  const source = readString(result.source)
  const fetchedAt = readString(result.fetchedAt)
  const cached = result.cached

  if (
    lat == null ||
    lng == null ||
    !formattedAddress ||
    source !== "google" ||
    !fetchedAt ||
    typeof cached !== "boolean"
  ) {
    throw new ApiError(
      "Could not read reverse geocode response.",
      500,
      INVALID_REVERSE_GEOCODE_RESPONSE,
    )
  }

  return {
    lat,
    lng,
    formattedAddress,
    placeId,
    source: "google",
    cached,
    fetchedAt,
  }
}

function parseReverseGeocodeResponse(value: unknown) {
  const response = readRecord(value)

  if (!response || response.success !== true || !("data" in response)) {
    throw new ApiError(
      "Could not read reverse geocode response.",
      500,
      INVALID_REVERSE_GEOCODE_RESPONSE,
    )
  }

  return parseReverseGeocodeResult(response.data)
}

export async function reverseGeocode({
  lat,
  lng,
  signal,
}: ReverseGeocodeInput) {
  const coordinates = readReverseGeocodeCoordinates(lat, lng)

  if (!coordinates) {
    throw new ApiError(
      "Valid latitude and longitude are required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.post<ReverseGeocodeResponse>(
    "/geocode/reverse",
    coordinates,
    true,
    signal,
  )

  return parseReverseGeocodeResponse(response.data)
}
