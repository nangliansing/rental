import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  isSavedListingAlreadyExistsError,
  isSavedListingNotFoundError,
} from "./deleteSavedListing"

describe("saved listing state errors", () => {
  it("recognizes an already-saved response as the requested saved state", () => {
    expect(
      isSavedListingAlreadyExistsError(
        new ApiError(
          "Listing is already saved",
          409,
          "SAVED_LISTING_ALREADY_EXISTS",
        ),
      ),
    ).toBe(true)
  })

  it("recognizes an already-unsaved response as the requested unsaved state", () => {
    expect(
      isSavedListingNotFoundError(
        new ApiError(
          "Saved listing not found",
          404,
          "SAVED_LISTING_NOT_FOUND",
        ),
      ),
    ).toBe(true)
  })

  it("does not hide unrelated request failures", () => {
    const error = new ApiError("Server unavailable", 503, "SERVICE_UNAVAILABLE")

    expect(isSavedListingAlreadyExistsError(error)).toBe(false)
    expect(isSavedListingNotFoundError(error)).toBe(false)
  })
})
