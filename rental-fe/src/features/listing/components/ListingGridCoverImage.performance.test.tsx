import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import {
  LISTING_GRID_COVER_BLUR_TEST_ID,
  LISTING_GRID_COVER_TEST_ID,
  ListingGridCoverImage,
} from "@/features/listing/components/ListingGridCoverImage"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import { LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD } from "@/shared/components/collections/listingCardGridVirtualization"
import { createSearchListing } from "@/test/fixtures/listings"

const cloudinarySource =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/room.jpg"

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 300,
    getVirtualItems: () => [{ index: 0, start: 0, key: "row-0" }],
    measureElement: vi.fn(),
    options: { scrollMargin: 0 },
  }),
  useWindowVirtualizer: () => ({
    getTotalSize: () => 300,
    getVirtualItems: () => [{ index: 0, start: 0, key: "row-0" }],
    measureElement: vi.fn(),
    options: { scrollMargin: 0 },
  }),
}))

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

describe("ListingGridCoverImage performance contract", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses one img and a css blur layer per tile (not gallery progressive img pair)", () => {
    const { container } = render(
      <ListingGridCoverImage src={cloudinarySource} alt="Grid room" />,
    )

    expect(container.querySelectorAll("img")).toHaveLength(1)
    expect(screen.getByTestId(LISTING_GRID_COVER_TEST_ID)).toBeInTheDocument()
    expect(screen.getByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)).toBeInTheDocument()
    expect(
      container.querySelector('[data-testid="progressive-cover-placeholder"]'),
    ).toBeNull()
  })

  it("never blocks on image.decode()", () => {
    const decode = vi.fn().mockRejectedValue(new Error("decode should not run"))
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: decode,
    })

    render(<ListingGridCoverImage src={cloudinarySource} alt="Grid room" />)

    fireEvent.load(screen.getByRole("img", { name: "Grid room" }))

    expect(decode).not.toHaveBeenCalled()

    delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })

  it("caps Cloudinary delivery at 480w with lazy async low-priority loading", () => {
    render(<ListingGridCoverImage src={cloudinarySource} alt="Grid room" />)

    const image = screen.getByRole("img", { name: "Grid room" })
    const src = image.getAttribute("src") ?? ""
    const srcSet = image.getAttribute("srcset") ?? ""

    expect(src).toContain("w_480")
    expect(src).not.toContain("w_640")
    expect(srcSet).toContain("w_240")
    expect(srcSet).toContain("w_320")
    expect(srcSet).not.toContain("w_640")
    expect(image).toHaveAttribute("loading", "lazy")
    expect(image).toHaveAttribute("decoding", "async")
    expect(image).toHaveAttribute("fetchpriority", "low")
  })

  it("uses a tiny 32px blur request for the pinterest placeholder", () => {
    render(<ListingGridCoverImage src={cloudinarySource} alt="Grid room" />)

    const blur = screen.getByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)
    expect(blur.style.backgroundImage).toContain("w_32")
    expect(blur.style.backgroundImage).toContain("e_blur:200")
    expect(blur.style.backgroundImage).not.toContain("w_48")
  })

  it("skips the blur request when a dominant color is provided", () => {
    render(
      <ListingGridCoverImage
        src={cloudinarySource}
        alt="Grid room"
        placeholderColor="#334155"
      />,
    )

    expect(
      screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId(LISTING_GRID_COVER_TEST_ID)).toHaveStyle({
      backgroundColor: "#334155",
    })
  })
})

describe("virtualized listing grid performance contract", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("mounts one img per visible card in a virtualized grid", () => {
    const listings = Array.from(
      { length: LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD },
      (_, index) =>
        createSearchListing({
          _id: `listing-${index}`,
          rent: 12000 + index,
          media: [
            {
              publicId: `listing/room-${index}`,
              secureUrl: cloudinarySource,
              alt: `Room ${index}`,
              isCover: true,
            },
          ],
        }),
    )

    const { container } = render(
      <MemoryRouter>
        <ListingCardGrid
          testId="performance-listing-grid"
          items={listings}
          getItemKey={(listing) => listing._id}
          renderItem={(listing) => <ListingGridCard listing={listing} />}
        />
      </MemoryRouter>,
    )

    const visibleCards = screen.getAllByRole("link", { name: /Open listing/ })
    const images = container.querySelectorAll("img")
    const blurLayers = screen.getAllByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)

    expect(visibleCards.length).toBeGreaterThan(0)
    expect(images).toHaveLength(visibleCards.length)
    expect(blurLayers).toHaveLength(visibleCards.length)
    expect(
      container.querySelectorAll('[data-testid="progressive-cover-placeholder"]'),
    ).toHaveLength(0)
  })
})
