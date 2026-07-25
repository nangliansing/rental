import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { server } from "@/test/server"

import {
  deleteAdminListing,
  isAdminListingNotFoundError,
} from "./deleteAdminListing"

describe("deleteAdminListing", () => {
  it("normalizes input and parses the deleted listing", async () => {
    server.use(
      http.delete(
        "/api/v1/admin/listings/:id",
        async ({ params, request }) => {
          expect(params.id).toBe("listing / 1")
          await expect(request.json()).resolves.toEqual({ reason: "Violation" })
          return HttpResponse.json({
            success: true,
            data: {
              _id: "listing / 1",
              listedBy: "owner-1",
              buildingId: "building-1",
              visibility: "PRIVATE",
              isDeleted: true,
            },
          })
        },
      ),
    )

    await expect(
      deleteAdminListing({
        listingId: "  listing / 1  ",
        reason: "  Violation  ",
      }),
    ).resolves.toMatchObject({
      _id: "listing / 1",
      visibility: "PRIVATE",
      isDeleted: true,
    })
  })

  it("rejects empty input before requesting", async () => {
    const request = vi.fn()
    server.use(http.delete("/api/v1/admin/listings/:id", request))

    await expect(
      deleteAdminListing({ listingId: " ", reason: "Violation" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      deleteAdminListing({ listingId: "listing-1", reason: " " }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("classifies only listing-not-found errors as idempotent", () => {
    expect(
      isAdminListingNotFoundError(
        new ApiError("Missing", 404, "LISTING_NOT_FOUND"),
      ),
    ).toBe(true)
    expect(
      isAdminListingNotFoundError(
        new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE"),
      ),
    ).toBe(false)
  })
})
