import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { SearchSavedListing } from "../api"
import {
  createSearchBuilding,
  createSearchListing,
  listingPhoto,
} from "@/test/fixtures/listings"

import { SavedListingGridCard } from "./SavedListingGridCard"

function createSavedListing(
  overrides: Partial<SearchSavedListing> = {},
): SearchSavedListing {
  return {
    _id: "saved-listing-1",
    listingId: "listing-1",
    buildingId: "building-1",
    listedBy: "user-1",
    snapshot: {
      rent: 14000,
      visibility: "PUBLIC",
      buildingName: "Bangkapi Residence",
      coverPhoto: listingPhoto,
    },
    listing: {
      ...createSearchListing(),
      building: createSearchBuilding(),
    },
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  }
}

describe("SavedListingGridCard", () => {
  it("keeps open and remove actions as separate accessible controls", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const onUnsave = vi.fn()
    const savedListing = createSavedListing()
    const { container } = render(
      <SavedListingGridCard
        savedListing={savedListing}
        showUnsaveButton
        onOpen={onOpen}
        onUnsave={onUnsave}
      />,
    )

    expect(container.querySelector("button button")).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("aspect-square")
    expect(container.firstElementChild).not.toHaveClass("rounded-lg")
    expect(
      container.querySelector('[data-slot="listing-grid-card-price"]'),
    ).toHaveClass("text-sm", "font-semibold")
    expect(
      container.querySelector('[data-slot="listing-grid-card-title"]'),
    ).toHaveClass("text-xs", "text-white/90")

    await user.click(
      screen.getByRole("button", { name: "Open saved listing ฿14k" }),
    )
    expect(onOpen).toHaveBeenCalledWith("listing-1")

    await user.click(
      screen.getByRole("button", { name: "Remove saved listing" }),
    )
    expect(onUnsave).toHaveBeenCalledWith(savedListing)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("uses the snapshot and remains non-interactive when live data is absent", () => {
    render(
      <SavedListingGridCard
        savedListing={createSavedListing({ listing: null })}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText("฿14k")).toBeInTheDocument()
    expect(screen.getByText("Bangkapi Residence")).toBeInTheDocument()
    expect(screen.getByText("No longer available")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Open saved listing/ }),
    ).not.toBeInTheDocument()
  })

  it("handles an absent snapshot and missing live listing defensively", () => {
    render(
      <SavedListingGridCard
        savedListing={createSavedListing({ listing: null, snapshot: null })}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText("Saved room")).toBeInTheDocument()
    expect(screen.getByText("Listing unavailable")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "Saved listing photo" }).tagName,
    ).toBe("DIV")
  })

  it("falls back when live and snapshot building names are blank", () => {
    render(
      <SavedListingGridCard
        savedListing={createSavedListing({
          listing: {
            ...createSearchListing(),
            building: createSearchBuilding({ name: "   " }),
          },
          snapshot: {
            rent: 14000,
            visibility: "PUBLIC",
            buildingName: "   ",
            coverPhoto: listingPhoto,
          },
        })}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText("Listing unavailable")).toBeInTheDocument()
  })

  it("uses the lazy grid cover for available saved listings", () => {
    render(
      <SavedListingGridCard
        savedListing={createSavedListing()}
        onOpen={vi.fn()}
      />,
    )

    const image = screen.getByRole("img", { name: "Bright rental room" })
    expect(image.tagName).toBe("IMG")
    expect(image).toHaveAttribute("loading", "lazy")
    expect(
      screen.queryByTestId("progressive-cover-placeholder"),
    ).not.toBeInTheDocument()
  })
})
