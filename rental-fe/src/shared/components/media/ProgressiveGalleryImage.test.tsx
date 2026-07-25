import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  ProgressiveGalleryImage,
  resetProgressiveGalleryCacheForTests,
  resetProgressiveGalleryPrefetchForTests,
} from "./ProgressiveGalleryImage"

const cloudinarySource =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg"

describe("ProgressiveGalleryImage", () => {
  afterEach(() => {
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
  })

  it("renders a blurred placeholder and full-resolution Cloudinary image", () => {
    render(
      <ProgressiveGalleryImage
        src={cloudinarySource}
        alt="Listing photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByTestId("progressive-gallery-placeholder")).toHaveAttribute(
      "src",
      expect.stringContaining("w_48"),
    )
    expect(
      screen.getByRole("img", { name: "Listing photo" }).getAttribute("src"),
    ).toContain("f_auto,q_auto,c_limit,w_")
  })

  it("reveals the full image once and keeps it after reload", async () => {
    const { rerender } = render(
      <ProgressiveGalleryImage
        src={cloudinarySource}
        alt="Listing photo"
        fallback={<div>Fallback</div>}
      />,
    )

    const fullImage = screen.getByRole("img", { name: "Listing photo" })
    expect(fullImage).toHaveClass("opacity-0")

    fireEvent.load(fullImage)

    await waitFor(() => {
      expect(fullImage).toHaveClass("opacity-100")
    })
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()

    rerender(
      <ProgressiveGalleryImage
        src={cloudinarySource}
        alt="Listing photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByRole("img", { name: "Listing photo" })).toHaveClass(
      "opacity-100",
    )
    expect(
      screen.queryByTestId("progressive-gallery-placeholder"),
    ).not.toBeInTheDocument()
  })

  it("falls back when the full image fails to load", () => {
    render(
      <ProgressiveGalleryImage
        src="https://example.com/photo.jpg"
        alt="Listing photo"
        fallback={<div>Fallback</div>}
      />,
    )

    fireEvent.error(screen.getByRole("img", { name: "Listing photo" }))

    expect(screen.getByText("Fallback")).toBeInTheDocument()
  })
})
