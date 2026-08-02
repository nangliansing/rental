import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"
import { server } from "@/test/server"

import { reverseGeocode } from "./reverseGeocode"

const sampleReverseGeocodeResponse = {
  success: true,
  data: {
    lat: 13.75633,
    lng: 100.50177,
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
    source: "google",
    cached: false,
    fetchedAt: "2026-08-02T05:00:00.000Z",
  },
}

describe("reverseGeocode", () => {
  it("posts rounded coordinates and parses the reverse geocode response", async () => {
    server.use(
      http.post("/api/v1/geocode/reverse", async ({ request }) => {
        const body = (await request.json()) as { lat: number; lng: number }

        expect(body).toEqual({
          lat: 13.75633,
          lng: 100.50177,
        })

        return HttpResponse.json(sampleReverseGeocodeResponse)
      }),
    )

    const result = await reverseGeocode({
      lat: 13.756331,
      lng: 100.501765,
    })

    expect(result).toEqual(sampleReverseGeocodeResponse.data)
  })

  it("rejects invalid coordinates before calling the API", async () => {
    await expect(
      reverseGeocode({
        lat: 120,
        lng: 100.501765,
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
  })

  it("maps GEOCODE_NOT_FOUND responses to ApiError", async () => {
    server.use(
      http.post("/api/v1/geocode/reverse", () =>
        HttpResponse.json(
          {
            success: false,
            code: "GEOCODE_NOT_FOUND",
            message: "No address was found for the provided coordinates",
          },
          { status: 404 },
        ),
      ),
    )

    await expect(
      reverseGeocode({
        lat: 13.756331,
        lng: 100.501765,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "No address was found for this location.",
        status: 404,
        code: "GEOCODE_NOT_FOUND",
      }),
    )
  })

  it("maps GEOCODE_NOT_CONFIGURED responses to ApiError", async () => {
    server.use(
      http.post("/api/v1/geocode/reverse", () =>
        HttpResponse.json(
          {
            success: false,
            code: "GEOCODE_NOT_CONFIGURED",
            message: "Reverse geocoding is not configured",
          },
          { status: 503 },
        ),
      ),
    )

    await expect(
      reverseGeocode({
        lat: 13.756331,
        lng: 100.501765,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Address lookup is not configured on the server. Enter the address manually.",
        status: 503,
        code: "GEOCODE_NOT_CONFIGURED",
      }),
    )
  })

  it("maps GEOCODE_UNAVAILABLE responses to ApiError", async () => {
    server.use(
      http.post("/api/v1/geocode/reverse", () =>
        HttpResponse.json(
          {
            success: false,
            code: "GEOCODE_UNAVAILABLE",
            message: "Reverse geocoding is temporarily unavailable",
          },
          { status: 503 },
        ),
      ),
    )

    await expect(
      reverseGeocode({
        lat: 13.756331,
        lng: 100.501765,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Address lookup is temporarily unavailable. Please try again.",
        status: 503,
        code: "GEOCODE_UNAVAILABLE",
      }),
    )
  })

  it("rejects malformed success payloads", async () => {
    server.use(
      http.post("/api/v1/geocode/reverse", () =>
        HttpResponse.json({
          success: true,
          data: {
            lat: 13.75633,
            formattedAddress: "123 Sukhumvit Rd",
          },
        }),
      ),
    )

    await expect(
      reverseGeocode({
        lat: 13.756331,
        lng: 100.501765,
      }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
