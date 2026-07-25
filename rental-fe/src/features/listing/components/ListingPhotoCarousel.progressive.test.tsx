import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ListingPhotoCarousel } from "@/features/listing/components/ListingPhotoCarousel"
import type { ListingMedia } from "@/features/map-search/types"

import { resetProgressiveGalleryCacheForTests } from "@/shared/components/media/ProgressiveGalleryImage"

const cloudinaryPhotos: ListingMedia[] = [
  {
    publicId: "listing-photo-1",
    secureUrl:
      "https://res.cloudinary.com/demo/image/upload/v123/listing/one.jpg",
    alt: "First room",
  },
  {
    publicId: "listing-photo-2",
    secureUrl:
      "https://res.cloudinary.com/demo/image/upload/v123/listing/two.jpg",
    alt: "Second room",
  },
]

describe("ListingPhotoCarousel progressive scenarios", () => {
  afterEach(() => {
    cleanup()
    resetProgressiveGalleryCacheForTests()
  })

  it("renders progressive cover placeholders in the carousel", () => {
    render(<ListingPhotoCarousel photos={cloudinaryPhotos} />)

    expect(screen.getAllByTestId("progressive-cover-placeholder")).toHaveLength(2)
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
  })

  it("keeps the photo counter visible after the sharp image loads", async () => {
    render(<ListingPhotoCarousel photos={cloudinaryPhotos} />)

    fireEvent.load(screen.getByRole("img", { name: "First room" }))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "First room" })).toHaveClass(
        "opacity-100",
      )
    })

    expect(screen.getByText("1/2")).toBeVisible()
  })

  it("opens the full progressive viewer from a carousel slide", async () => {
    render(<ListingPhotoCarousel photos={cloudinaryPhotos} />)

    fireEvent.load(screen.getByRole("img", { name: "First room" }))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "First room" })).toHaveClass(
        "opacity-100",
      )
    })

    fireEvent.click(screen.getByRole("button", { name: "Open photo 1" }))

    const dialog = screen.getByRole("dialog", { name: "Listing photos" })
    const viewerImage = within(dialog).getByRole("img", { name: "First room" })
    fireEvent.load(viewerImage)

    await waitFor(() => {
      expect(viewerImage).toHaveClass("opacity-100")
    })
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument()
  })

  it("shows the empty state when there are no photos", () => {
    render(<ListingPhotoCarousel photos={[]} />)

    expect(screen.getByText("No photo")).toBeInTheDocument()
  })
})
