import { describe, expect, it } from "vitest"

import type { OwnerListing } from "../api"
import { createSearchListing } from "@/test/fixtures/listings"

import { mapListingToFormValues } from "./mapListingToFormValues"

function createOwnerListing(
  overrides: Partial<OwnerListing> = {},
): OwnerListing {
  return {
    ...createSearchListing(overrides),
    building: null,
  }
}

describe("mapListingToFormValues privateNote", () => {
  it("maps an owner listing privateNote into the form", () => {
    expect(
      mapListingToFormValues(
        createOwnerListing({ privateNote: "Gate code 1234" }),
      ).privateNote,
    ).toBe("Gate code 1234")
  })

  it("defaults privateNote to an empty string when the API omits it", () => {
    expect(mapListingToFormValues(createOwnerListing()).privateNote).toBe("")
  })

  it("defaults privateNote to an empty string when the API sends null", () => {
    expect(
      mapListingToFormValues(createOwnerListing({ privateNote: null })).privateNote,
    ).toBe("")
  })

  it("preserves multiline private notes for edit prefill", () => {
    expect(
      mapListingToFormValues(
        createOwnerListing({
          privateNote: "Gate code 1234\nCall before viewing",
        }),
      ).privateNote,
    ).toBe("Gate code 1234\nCall before viewing")
  })

  it("maps privateNote independently from description", () => {
    const values = mapListingToFormValues(
      createOwnerListing({
        description: "Public room details",
        privateNote: "Owner-only instructions",
      }),
    )

    expect(values.description).toBe("Public room details")
    expect(values.privateNote).toBe("Owner-only instructions")
  })
})
