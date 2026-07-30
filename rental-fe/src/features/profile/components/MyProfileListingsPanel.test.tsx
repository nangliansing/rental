import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MyProfileListingsPanel } from "./MyProfileListingsPanel"

const mockUseSearchOwnerListings = vi.hoisted(() => vi.fn())

vi.mock("@/features/listing/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/listing/api")>()

  return {
    ...actual,
    useSearchOwnerListings: mockUseSearchOwnerListings,
  }
})

vi.mock("@/features/listing/components/grid-preview", () => ({
  useListingGridPreview: () => ({
    isOpen: false,
    listing: null,
    triggerRef: { current: null },
    openPreview: vi.fn(),
    closePreview: vi.fn(),
  }),
  ListingGridPreviewPortal: () => null,
}))

describe("MyProfileListingsPanel", () => {
  it("requests owner listings with the active filter and sort", () => {
    mockUseSearchOwnerListings.mockReturnValue({
      isLoading: true,
    })

    render(<MyProfileListingsPanel filter="now" sort="oldest" />)

    expect(mockUseSearchOwnerListings).toHaveBeenCalledWith({
      filter: "now",
      sort: "oldest",
    })
  })

  it("shows the filter-specific empty state when the query succeeds with no rows", () => {
    mockUseSearchOwnerListings.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        pages: [{
          data: {
            agentProfile: null,
            listings: [],
          },
        }],
      },
    })

    render(<MyProfileListingsPanel filter="private" sort="latest" />)

    expect(
      screen.getByRole("heading", { name: "No private listings" }),
    ).toBeInTheDocument()
  })

  it("shows a retry affordance when the query fails", () => {
    const refetch = vi.fn()
    mockUseSearchOwnerListings.mockReturnValue({
      isLoading: false,
      isError: true,
      refetch,
    })

    render(<MyProfileListingsPanel filter="all" sort="latest" />)

    expect(
      screen.getByRole("heading", { name: "Could not load listings" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})
