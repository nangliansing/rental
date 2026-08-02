import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import { ListingPhotoCarousel } from "@/features/listing/components/ListingPhotoCarousel"
import { ListingCoverImage } from "@/features/listing/components/ListingPresentationPrimitives"
import { ListingPostBody } from "@/features/listing/components/ListingPostBody"
import type { ListingMedia } from "@/features/map-search/types"
import { createSearchListing } from "@/test/fixtures/listings"

import {
  COVER_CAROUSEL_MAX_WIDTH,
  resolveCoverImageDelivery,
} from "./gallery-image-delivery"
import { ProgressiveCoverImage } from "./ProgressiveCoverImage"
import { resetProgressiveGalleryCacheForTests } from "./ProgressiveGalleryImage"
import { resetProgressiveGalleryPrefetchForTests } from "./prefetch-progressive-gallery-image"

const cloudinaryPhoto: ListingMedia = {
  publicId: "listing/room-1",
  secureUrl:
    "https://res.cloudinary.com/demo/image/upload/v123/listing/room-1.jpg",
  alt: "Bright rental room",
  isCover: true,
}

const cloudinaryPhotos: ListingMedia[] = [
  cloudinaryPhoto,
  {
    publicId: "listing/room-2",
    secureUrl:
      "https://res.cloudinary.com/demo/image/upload/v123/listing/room-2.jpg",
    alt: "Second room",
  },
]

describe("progressive image integration", () => {
  afterEach(() => {
    cleanup()
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
    vi.restoreAllMocks()
  })

  describe("grid card to listing detail flow", () => {
    it("uses a lightweight grid cover while the carousel keeps progressive blur", async () => {
      render(
        <MemoryRouter>
          <ListingGridCard
            listing={createSearchListing({
              media: [cloudinaryPhoto],
            })}
          />
        </MemoryRouter>,
      )

      const gridImage = screen.getByRole("img", { name: "Bright rental room" })
      expect(gridImage.tagName).toBe("IMG")
      expect(gridImage).toHaveAttribute("loading", "lazy")
      expect(
        screen.queryByTestId("progressive-cover-placeholder"),
      ).not.toBeInTheDocument()

      cleanup()

      render(<ListingPhotoCarousel photos={cloudinaryPhotos} />)

      expect(screen.getAllByTestId("progressive-cover-placeholder").length).toBeGreaterThan(0)
      expect(screen.getByRole("img", { name: "Bright rental room" })).toHaveClass(
        "opacity-0",
      )
      expect(screen.getByText("1/2")).toBeVisible()
    })
  })

  describe("listing detail carousel and viewer flow", () => {
    it("shows blur first, then sharp image, then opens the viewer", async () => {
      render(<ListingPhotoCarousel photos={cloudinaryPhotos} />)

      expect(screen.getAllByTestId("progressive-cover-placeholder")).toHaveLength(2)
      expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()

      const coverImage = screen.getByRole("img", { name: "Bright rental room" })
      expect(coverImage).toHaveClass("opacity-0", "absolute", "inset-0")

      fireEvent.load(coverImage)

      await waitFor(() => {
        expect(coverImage).toHaveClass("opacity-100")
      })

      expect(screen.getByText("1/2")).toBeVisible()

      fireEvent.click(screen.getByRole("button", { name: "Open photo 1" }))

      const dialog = screen.getByRole("dialog", { name: "Listing photos" })
      const viewerImage = within(dialog).getByRole("img", { name: "Bright rental room" })
      expect(viewerImage).toHaveClass("opacity-0")

      fireEvent.load(viewerImage)

      await waitFor(() => {
        expect(viewerImage).toHaveClass("opacity-100")
      })
      expect(within(dialog).getByText("1 / 2")).toBeInTheDocument()
    })

    it("keeps carousel overlays visible while the second slide is still loading", async () => {
      render(<ListingPhotoCarousel photos={cloudinaryPhotos} />)

      fireEvent.load(screen.getByRole("img", { name: "Bright rental room" }))

      await waitFor(() => {
        expect(screen.getByRole("img", { name: "Bright rental room" })).toHaveClass(
          "opacity-100",
        )
      })

      expect(screen.getByText("1/2")).toBeVisible()
      expect(screen.getAllByTestId("progressive-cover-placeholder")).toHaveLength(1)
    })
  })

  describe("listing post body integration", () => {
    it("keeps the carousel counter visible through the full load cycle", async () => {
      render(
        <ListingPostBody
          listing={createSearchListing({
            media: cloudinaryPhotos,
          })}
        />,
      )

      expect(screen.getAllByTestId("progressive-cover-placeholder").length).toBeGreaterThan(0)
      expect(screen.getByText("1/2")).toBeVisible()
      expect(screen.getByLabelText("Flexible")).toBeVisible()

      fireEvent.load(screen.getByRole("img", { name: "Bright rental room" }))

      await waitFor(() => {
        expect(screen.getByRole("img", { name: "Bright rental room" })).toHaveClass(
          "opacity-100",
        )
      })

      expect(screen.getByText("1/2")).toBeVisible()
      expect(screen.getByLabelText("Flexible")).toBeVisible()
    })
  })

  describe("listing cover wrapper", () => {
    it("uses progressive blur for Cloudinary listing photos", () => {
      render(
        <div className="relative aspect-square">
          <ListingCoverImage photo={cloudinaryPhoto} />
        </div>,
      )

      expect(screen.getByTestId("progressive-cover-placeholder")).toBeInTheDocument()
      expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
    })

    it("loads external listing photos without blur", () => {
      render(
        <ListingCoverImage
          photo={{
            secureUrl: "https://example.com/room.jpg",
            alt: "External room",
          }}
        />,
      )

      expect(
        screen.queryByTestId("progressive-cover-placeholder"),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("img", { name: "External room" })).toHaveAttribute(
        "src",
        "https://example.com/room.jpg",
      )
    })
  })

  describe("delivery width boundaries", () => {
    it("uses 640px for cards and 960px for carousel covers", () => {
      const cardDelivery = resolveCoverImageDelivery(cloudinaryPhoto.secureUrl, 640)!
      const carouselDelivery = resolveCoverImageDelivery(
        cloudinaryPhoto.secureUrl,
        COVER_CAROUSEL_MAX_WIDTH,
      )!

      render(
        <>
          <ProgressiveCoverImage
            src={cloudinaryPhoto.secureUrl}
            alt="Card cover"
            fallback={<div>Fallback</div>}
          />
          <ProgressiveCoverImage
            src={cloudinaryPhoto.secureUrl}
            alt="Carousel cover"
            maxWidth={COVER_CAROUSEL_MAX_WIDTH}
            fallback={<div>Fallback</div>}
          />
        </>,
      )

      expect(screen.getByRole("img", { name: "Card cover" })).toHaveAttribute(
        "src",
        cardDelivery.fullUrl,
      )
      expect(screen.getByRole("img", { name: "Carousel cover" })).toHaveAttribute(
        "src",
        carouselDelivery.fullUrl,
      )
      expect(cardDelivery.fullUrl).not.toBe(carouselDelivery.fullUrl)
    })
  })

  describe("failure and empty states", () => {
    it("shows fallback when the carousel cover fails to load", () => {
      render(
        <ListingPhotoCarousel
          photos={[
            {
              publicId: "broken",
              secureUrl: "https://example.com/broken.jpg",
              alt: "Broken room",
            },
          ]}
        />,
      )

      fireEvent.error(screen.getByRole("img", { name: "Broken room" }))
      expect(screen.getByText("Photo unavailable")).toBeInTheDocument()
    })

    it("shows the empty carousel state without progressive placeholders", () => {
      render(<ListingPhotoCarousel photos={[]} />)

      expect(screen.queryByTestId("progressive-cover-placeholder")).not.toBeInTheDocument()
      expect(screen.getByText("No photo")).toBeInTheDocument()
    })
  })
})
