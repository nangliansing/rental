import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveGalleryImageDelivery } from "./gallery-image-delivery"
import {
  ProgressiveGalleryImage,
  resetProgressiveGalleryCacheForTests,
  resetProgressiveGalleryPrefetchForTests,
} from "./ProgressiveGalleryImage"
import { prefetchProgressiveGalleryImage } from "./prefetch-progressive-gallery-image"
import {
  isGallerySourceLoaded,
  markGallerySourceLoaded,
} from "./progressive-gallery-cache"

const cloudinaryOne =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/one.jpg"
const cloudinaryTwo =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/two.jpg"
const externalOne = "https://example.com/one.jpg"

describe("ProgressiveGalleryImage scenarios", () => {
  afterEach(() => {
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
  })

  it("shows only a spinner for non-Cloudinary sources", () => {
    render(
      <ProgressiveGalleryImage
        src={externalOne}
        alt="External photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(
      screen.queryByTestId("progressive-gallery-placeholder"),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText("Loading photo")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "External photo" })).toHaveAttribute(
      "src",
      externalOne,
    )
  })

  it("renders cached Cloudinary photos instantly when the exact delivery url is ready", async () => {
    const delivery = resolveGalleryImageDelivery(cloudinaryOne)!
    markGallerySourceLoaded(delivery.fullUrl)

    render(
      <ProgressiveGalleryImage
        src={cloudinaryOne}
        alt="Cached photo"
        fallback={<div>Fallback</div>}
      />,
    )

    const fullImage = screen.getByRole("img", { name: "Cached photo" })
    Object.defineProperty(fullImage, "complete", {
      configurable: true,
      value: true,
    })
    Object.defineProperty(fullImage, "naturalWidth", {
      configurable: true,
      value: 780,
    })
    Object.defineProperty(fullImage, "currentSrc", {
      configurable: true,
      value: delivery.fullUrl,
    })

    fireEvent.load(fullImage)

    await waitFor(() => {
      expect(fullImage).toHaveClass("opacity-100")
    })
    expect(fullImage).not.toHaveClass("transition-opacity")
    expect(
      screen.queryByTestId("progressive-gallery-placeholder"),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
  })

  it("ignores stale decode completion after the source changes", async () => {
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
      <ProgressiveGalleryImage
        src={cloudinaryOne}
        alt="Gallery photo"
        fallback={<div>Fallback</div>}
      />,
    )

    const image = screen.getByRole("img", { name: "Gallery photo" })
    fireEvent.load(image)

    rerender(
      <ProgressiveGalleryImage
        src={cloudinaryTwo}
        alt="Gallery photo"
        fallback={<div>Fallback</div>}
      />,
    )

    resolveDecode?.()
    await Promise.resolve()

    const oneDelivery = resolveGalleryImageDelivery(cloudinaryOne)!
    const twoDelivery = resolveGalleryImageDelivery(cloudinaryTwo)!

    expect(isGallerySourceLoaded(oneDelivery.fullUrl)).toBe(false)
    expect(isGallerySourceLoaded(twoDelivery.fullUrl)).toBe(false)
    expect(screen.getByLabelText("Loading photo")).toBeInTheDocument()

    delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })

  it("still reveals when decode rejects", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: vi.fn().mockRejectedValueOnce(new Error("decode failed")),
    })

    render(
      <ProgressiveGalleryImage
        src={cloudinaryOne}
        alt="Gallery photo"
        fallback={<div>Fallback</div>}
      />,
    )

    const fullImage = screen.getByRole("img", { name: "Gallery photo" })
    fireEvent.load(fullImage)

    await waitFor(() => {
      expect(fullImage).toHaveClass("opacity-100")
    })

    delete (HTMLImageElement.prototype as { decode?: unknown }).decode
  })

  it("uses fallback for blank sources", () => {
    render(
      <ProgressiveGalleryImage
        src="   "
        alt="Missing photo"
        fallback={<div>Fallback</div>}
      />,
    )

    expect(screen.getByText("Fallback")).toBeInTheDocument()
  })
})

describe("prefetchProgressiveGalleryImage scenarios", () => {
  afterEach(() => {
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
    vi.restoreAllMocks()
  })

  it("deduplicates in-flight prefetches for the same source", async () => {
    let constructed = 0
    const originalImage = globalThis.Image

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      decode = vi.fn().mockResolvedValue(undefined)

      constructor() {
        constructed += 1
      }

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.()
        })
      }
    }

    globalThis.Image = MockImage as typeof Image

    try {
      await Promise.all([
        prefetchProgressiveGalleryImage(cloudinaryOne),
        prefetchProgressiveGalleryImage(cloudinaryOne),
      ])

      expect(constructed).toBe(1)
      expect(
        isGallerySourceLoaded(
          resolveGalleryImageDelivery(cloudinaryOne)!.fullUrl,
        ),
      ).toBe(true)
    } finally {
      globalThis.Image = originalImage
    }
  })

  it("ignores prefetch failures without marking the source loaded", async () => {
    const originalImage = globalThis.Image

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.()
        })
      }
    }

    globalThis.Image = MockImage as typeof Image

    try {
      await prefetchProgressiveGalleryImage(cloudinaryOne)
      expect(
        isGallerySourceLoaded(
          resolveGalleryImageDelivery(cloudinaryOne)!.fullUrl,
        ),
      ).toBe(false)
    } finally {
      globalThis.Image = originalImage
    }
  })
})
