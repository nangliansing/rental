import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import {
  ListingGridPreviewPortal,
  useListingGridPreview,
} from "@/features/listing/components/grid-preview"
import { createSearchListing } from "@/test/fixtures/listings"

import { ListingCardGrid } from "./ListingCardGrid"
import { LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD } from "./listingCardGridVirtualization"

let intersectionCallback: IntersectionObserverCallback

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ""
  readonly scrollMargin = ""
  readonly thresholds = []
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn()

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback
  }
}

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 300,
    getVirtualItems: () => [{ index: 0, start: 0, key: "row-0" }],
    measureElement: vi.fn(),
  }),
}))

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

function ListingGridPreviewHarness() {
  const preview = useListingGridPreview()
  const listings = Array.from({ length: LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD }, (_, index) =>
    createSearchListing({
      _id: `listing-${index}`,
      rent: 12000 + index,
    }),
  )

  return (
    <>
      <ListingCardGrid
        testId="profile-listing-grid"
        items={listings}
        getItemKey={(listing) => listing._id}
        renderItem={(listing) => (
          <ListingGridCard listing={listing} onActivate={preview.openPreview} />
        )}
        hasNextPage={false}
        onFetchNextPage={vi.fn()}
        endMessage="No more listings"
      />
      <ListingGridPreviewPortal
        preview={preview}
        detailMode="modal"
        onOpenDetail={vi.fn()}
      />
    </>
  )
}

describe("listing grid stack integration", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  it("keeps one shared preview modal while rendering a virtualized grid of cards", () => {
    render(
      <MemoryRouter>
        <ListingGridPreviewHarness />
      </MemoryRouter>,
    )

    expect(screen.getByTestId("profile-listing-grid")).toHaveStyle({
      height: "300px",
    })
    expect(screen.getAllByRole("button", { name: /Open listing/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens the shared preview without mounting a modal per card", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ListingGridPreviewHarness />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Open listing ฿12k" }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })

  it("still exposes pagination controls for item-driven grids", () => {
    const onFetchNextPage = vi.fn()

    render(
      <ListingCardGrid
        hasNextPage
        isFetchingNextPage={false}
        onFetchNextPage={onFetchNextPage}
        items={[createSearchListing()]}
        getItemKey={(listing) => listing._id}
        renderItem={(listing) => (
          <MemoryRouter>
            <ListingGridCard listing={listing} />
          </MemoryRouter>
        )}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    expect(onFetchNextPage).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: /Open listing/ })).toBeInTheDocument()
  })
})
