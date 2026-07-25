import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProgressiveCoverImage } from "./ProgressiveCoverImage"
import {
  COVER_CAROUSEL_MAX_WIDTH,
  resolveCoverImageDelivery,
} from "./gallery-image-delivery"
import { resetProgressiveGalleryCacheForTests } from "./ProgressiveGalleryImage"
import { prefetchProgressiveGalleryImage, resetProgressiveGalleryPrefetchForTests } from "./prefetch-progressive-gallery-image"
import {
  isGallerySourceLoaded,
  markGallerySourceLoaded,
} from "./progressive-gallery-cache"

const cloudinaryOne =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/one.jpg"
const cloudinaryTwo =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/two.jpg"
const externalOne = "https://example.com/one.jpg"

describe("ProgressiveCoverImage scenarios", () => {
  afterEach(() => {
    cleanup()
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
    vi.restoreAllMocks()
  })

  it("shows blur for Cloudinary sources but never a spinner", () => {
    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByTestId("progressive-cover-placeholder")).toBeInTheDocument()
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
  })

  it("loads non-Cloudinary sources without blur or spinner", () => {
    render(
      <ProgressiveCoverImage
        src={externalOne}
        alt="External photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(
      screen.queryByTestId("progressive-cover-placeholder"),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "External photo" })).toHaveAttribute(
      "src",
      externalOne,
    )
  })

  it("renders cached covers instantly when the exact delivery url is ready", async () => {
    const delivery = resolveCoverImageDelivery(cloudinaryOne)!
    markGallerySourceLoaded(delivery.fullUrl)

    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Cached cover"
        fallback={<div>Fallback</div>}
      />,
    )

    const image = screen.getByRole("img", { name: "Cached cover" })
    Object.defineProperty(image, "complete", {
      configurable: true,
      value: true,
    })
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      value: 640,
    })
    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: delivery.fullUrl,
    })

    fireEvent.load(image)

    await waitFor(() => {
      expect(image).toHaveClass("opacity-100")
    })
    expect(image).not.toHaveClass("transition-opacity")
    expect(
      screen.queryByTestId("progressive-cover-placeholder"),
    ).not.toBeInTheDocument()
  })

  it("shows blur when a smaller cover variant was cached but a larger delivery is requested", () => {
    const cardDelivery = resolveCoverImageDelivery(cloudinaryOne, 640)!
    markGallerySourceLoaded(cardDelivery.fullUrl)

    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Carousel cover"
        maxWidth={COVER_CAROUSEL_MAX_WIDTH}
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByTestId("progressive-cover-placeholder")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Carousel cover" })).toHaveClass(
      "opacity-0",
    )
  })

  it("opens the cover instantly when the same cover delivery url was cached", async () => {
    const delivery = resolveCoverImageDelivery(cloudinaryOne)!
    markGallerySourceLoaded(delivery.fullUrl)

    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Cached cover"
        fallback={<div>Fallback</div>}
      />,
    )

    const image = screen.getByRole("img", { name: "Cached cover" })
    Object.defineProperty(image, "complete", {
      configurable: true,
      value: true,
    })
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      value: 640,
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
      screen.queryByTestId("progressive-cover-placeholder"),
    ).not.toBeInTheDocument()
  })

  it("ignores stale decode completion after the cover source changes", async () => {
    let resolveDecode: (() => void) | undefined
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDecode = resolve
          }),
      ),
    })

    const { rerender } = render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    fireEvent.load(screen.getByRole("img", { name: "Room photo" }))

    rerender(
      <ProgressiveCoverImage
        src={cloudinaryTwo}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    resolveDecode?.()
    await Promise.resolve()

    const oneDelivery = resolveCoverImageDelivery(cloudinaryOne)!
    const twoDelivery = resolveCoverImageDelivery(cloudinaryTwo)!

    expect(isGallerySourceLoaded(oneDelivery.fullUrl)).toBe(false)
    expect(isGallerySourceLoaded(twoDelivery.fullUrl)).toBe(false)
    expect(screen.getByTestId("progressive-cover-placeholder")).toBeInTheDocument()

    delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })

  it("still reveals covers when decode rejects", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: vi.fn().mockRejectedValueOnce(new Error("decode failed")),
    })

    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    const image = screen.getByRole("img", { name: "Room photo" })
    fireEvent.load(image)

    await waitFor(() => {
      expect(image).toHaveClass("opacity-100")
    })

    delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })
})

describe("prefetchProgressiveGalleryImage defensive scenarios", () => {
  afterEach(() => {
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
  })

  it("resolves immediately for invalid sources", async () => {
    await expect(prefetchProgressiveGalleryImage("   ")).resolves.toBeUndefined()
    await expect(prefetchProgressiveGalleryImage(null)).resolves.toBeUndefined()
  })
})

describe("cross-variant cache scenarios", () => {
  afterEach(() => {
    cleanup()
    resetProgressiveGalleryCacheForTests()
  })

  it("reuses cache when the same cover delivery url renders again", async () => {
    const coverDelivery = resolveCoverImageDelivery(cloudinaryOne)!

    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
        alt="Room photo"
        fallback={<div>Fallback</div>}
      />,
    )

    fireEvent.load(screen.getByRole("img", { name: "Room photo" }))

    await waitFor(() => {
      expect(isGallerySourceLoaded(coverDelivery.fullUrl)).toBe(true)
    })

    cleanup()

    render(
      <ProgressiveCoverImage
        src={cloudinaryOne}
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
      value: 640,
    })
    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: coverDelivery.fullUrl,
    })

    fireEvent.load(image)

    await waitFor(() => {
      expect(image).toHaveClass("opacity-100")
    })
    expect(
      screen.queryByTestId("progressive-cover-placeholder"),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
  })
})
