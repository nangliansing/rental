import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import { REVERSE_GEOCODE_STALE_TIME_MS } from "../constants"
import type { ReverseGeocodeResult } from "./reverseGeocode"

const reverseGeocode = vi.hoisted(() => vi.fn())

vi.mock("./reverseGeocode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./reverseGeocode")>()
  return { ...actual, reverseGeocode }
})

import {
  reverseGeocodeQueryOptions,
  useReverseGeocode,
} from "./useReverseGeocode"

const sampleResult: ReverseGeocodeResult = {
  lat: 13.75633,
  lng: 100.50177,
  formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
  placeId: "place-123",
  source: "google",
  cached: false,
  fetchedAt: "2026-08-02T05:00:00.000Z",
}

function createWrapper() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: () => undefined,
    }),
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        throwOnError: false,
      },
    },
  })

  return {
    queryClient,
    Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    },
  }
}

describe("reverseGeocodeQueryOptions", () => {
  it("uses rounded coordinates in the query key", () => {
    const options = reverseGeocodeQueryOptions({
      lat: 13.756331,
      lng: 100.501765,
    })

    expect(options.queryKey).toEqual(
      queryKeys.geocode.reverse(13.75633, 100.50177),
    )
    expect(options.enabled).toBe(true)
    expect(options.staleTime).toBe(REVERSE_GEOCODE_STALE_TIME_MS)
  })

  it("shares the query key for nearby coordinates", () => {
    const first = reverseGeocodeQueryOptions({
      lat: 13.756331,
      lng: 100.501765,
    })
    const second = reverseGeocodeQueryOptions({
      lat: 13.756329,
      lng: 100.501769,
    })

    expect(first.queryKey).toEqual(second.queryKey)
  })

  it("stays disabled for invalid coordinates", () => {
    expect(
      reverseGeocodeQueryOptions({ lat: 120, lng: 100.501765 }).enabled,
    ).toBe(false)
    expect(
      reverseGeocodeQueryOptions({ lat: null, lng: 100.501765 }).enabled,
    ).toBe(false)
    expect(
      reverseGeocodeQueryOptions({
        lat: 13.756331,
        lng: 100.501765,
        enabled: false,
      }).enabled,
    ).toBe(false)
  })

  it("does not retry client or provider errors", () => {
    const retry = reverseGeocodeQueryOptions({
      lat: 13.756331,
      lng: 100.501765,
    }).retry

    expect(typeof retry).toBe("function")
    expect(
      (retry as (failureCount: number, error: unknown) => boolean)(
        0,
        new ApiError("No address was found for this location.", 404, "GEOCODE_NOT_FOUND"),
      ),
    ).toBe(false)
    expect(
      (retry as (failureCount: number, error: unknown) => boolean)(
        0,
        new ApiError("Too many attempts. Please wait and try again.", 429, "RATE_LIMIT_EXCEEDED"),
      ),
    ).toBe(false)
    expect(
      (retry as (failureCount: number, error: unknown) => boolean)(
        0,
        new ApiError(
          "Address lookup is not configured on the server. Enter the address manually.",
          503,
          "GEOCODE_NOT_CONFIGURED",
        ),
      ),
    ).toBe(false)
    expect(
      (retry as (failureCount: number, error: unknown) => boolean)(
        0,
        new ApiError("Address lookup is temporarily unavailable. Please try again.", 503, "GEOCODE_UNAVAILABLE"),
      ),
    ).toBe(true)
    expect(
      (retry as (failureCount: number, error: unknown) => boolean)(
        1,
        new ApiError("Address lookup is temporarily unavailable. Please try again.", 503, "GEOCODE_UNAVAILABLE"),
      ),
    ).toBe(false)
  })
})

describe("useReverseGeocode", () => {
  beforeEach(() => reverseGeocode.mockReset())

  it("does not fetch when disabled or coordinates are invalid", async () => {
    const { Wrapper } = createWrapper()

    const { rerender } = renderHook(
      ({
        enabled,
        lat,
        lng,
      }: {
        enabled: boolean
        lat?: number | null
        lng?: number | null
      }) => useReverseGeocode({ lat, lng, enabled }),
      {
        initialProps: {
          enabled: false,
          lat: 13.756331,
          lng: 100.501765,
        },
        wrapper: Wrapper,
      },
    )

    await act(async () => undefined)
    expect(reverseGeocode).not.toHaveBeenCalled()

    rerender({ enabled: true, lat: null, lng: 100.501765 })
    await act(async () => undefined)
    expect(reverseGeocode).not.toHaveBeenCalled()
  })

  it("fetches once and reuses cache for nearby coordinates", async () => {
    reverseGeocode.mockResolvedValue(sampleResult)

    const { queryClient, Wrapper } = createWrapper()

    const first = renderHook(
      () =>
        useReverseGeocode({
          lat: 13.756331,
          lng: 100.501765,
        }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    expect(reverseGeocode).toHaveBeenCalledTimes(1)
    expect(reverseGeocode).toHaveBeenCalledWith({
      lat: 13.75633,
      lng: 100.50177,
      signal: expect.any(AbortSignal),
    })
    expect(first.result.current.formattedAddress).toBe(
      "123 Sukhumvit Rd, Bangkok, Thailand",
    )

    first.unmount()

    const second = renderHook(
      () =>
        useReverseGeocode({
          lat: 13.756329,
          lng: 100.501769,
        }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(reverseGeocode).toHaveBeenCalledTimes(1)
    expect(
      queryClient.getQueryData(
        queryKeys.geocode.reverse(13.75633, 100.50177),
      ),
    ).toEqual(sampleResult)
  })

  it("surfaces GEOCODE_NOT_FOUND from the query function", async () => {
    reverseGeocode.mockRejectedValueOnce(
      new ApiError(
        "No address was found for this location.",
        404,
        "GEOCODE_NOT_FOUND",
      ),
    )

    const { queryClient } = createWrapper()

    await expect(
      queryClient.fetchQuery(
        reverseGeocodeQueryOptions({
          lat: 13.756331,
          lng: 100.501765,
        }),
      ),
    ).rejects.toMatchObject({
      code: "GEOCODE_NOT_FOUND",
      status: 404,
    })
  })
})
