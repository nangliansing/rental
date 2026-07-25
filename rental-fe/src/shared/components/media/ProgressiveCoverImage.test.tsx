import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ProgressiveCoverImage } from "./ProgressiveCoverImage"
import { resolveCoverImageDelivery, resolveGalleryImageDelivery } from "./gallery-image-delivery"
import { ProgressiveGalleryImage, resetProgressiveGalleryCacheForTests } from "./ProgressiveGalleryImage"
import { isGallerySourceLoaded, markGallerySourceLoaded } from "./progressive-gallery-cache"

const cloudinarySource =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg"

describe("ProgressiveCoverImage", () => {
  afterEach(() => {
    resetProgressiveGalleryCacheForTests()
  })

  it("renders a blurred placeholder without a loading spinner", () => {
    render(
      <ProgressiveCoverImage
        src={cloudinarySource}
        alt="Room photo"
        maxWidth={960}
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByTestId("progressive-cover-placeholder")).toHaveAttribute(
      "src",
      expect.stringContaining("w_48"),
    )
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Room photo" })).toHaveAttribute(
      "src",
      expect.stringContaining("w_960"),
    )
  })

  it("marks the loaded cover delivery url in cache", async () => {
    const coverDelivery = resolveCoverImageDelivery(cloudinarySource)!
    render(
      <ProgressiveCoverImage
        src={cloudinarySource}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    fireEvent.load(screen.getByRole("img", { name: "Room photo" }))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Room photo" })).toHaveClass(
        "opacity-100",
      )
    })

    expect(isGallerySourceLoaded(coverDelivery.fullUrl)).toBe(true)
  })

  it("still shows gallery loading when only the smaller cover delivery was cached", () => {
    const coverDelivery = resolveCoverImageDelivery(cloudinarySource)!
    markGallerySourceLoaded(coverDelivery.fullUrl)

    render(
      <ProgressiveGalleryImage
        src={cloudinarySource}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByTestId("progressive-gallery-placeholder")).toBeInTheDocument()
    expect(screen.getByLabelText("Loading photo")).toBeInTheDocument()
  })

  it("opens the gallery instantly when the same gallery delivery url was cached", async () => {
    const delivery = resolveGalleryImageDelivery(cloudinarySource)!
    markGallerySourceLoaded(delivery.fullUrl)

    render(
      <ProgressiveGalleryImage
        src={cloudinarySource}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    const image = screen.getByRole("img", { name: "Room photo" })
    Object.defineProperty(image, "complete", {
      configurable: true,
      value: true,
    })
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      value: 780,
    })
    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: delivery.fullUrl,
    })

    fireEvent.load(image)

    await waitFor(() => {
      expect(image).toHaveClass("opacity-100")
    })
    expect(
      screen.queryByTestId("progressive-gallery-placeholder"),
    ).not.toBeInTheDocument()
  })

  it("shows fallback on load failure", () => {
    render(
      <ProgressiveCoverImage
        src="https://example.com/broken.jpg"
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    fireEvent.error(screen.getByRole("img", { name: "Room photo" }))

    expect(screen.getByText("Fallback")).toBeInTheDocument()
  })

  it("shows fallback for blank sources", () => {
    render(
      <ProgressiveCoverImage
        src="   "
        alt="Missing photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByText("Fallback")).toBeInTheDocument()
  })

  it("caps an oversized cover width defensively", () => {
    render(
      <ProgressiveCoverImage
        src={cloudinarySource}
        alt="Room photo"
        maxWidth={5000}
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByRole("img", { name: "Room photo" })).toHaveAttribute(
      "src",
      expect.stringContaining("w_960"),
    )
  })
})
