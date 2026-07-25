import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveCoverImageDelivery, resolveGalleryImageDelivery } from "./gallery-image-delivery"
import { prefetchProgressiveGalleryImage, resetProgressiveGalleryPrefetchForTests } from "./prefetch-progressive-gallery-image"
import {
  isGallerySourceLoaded,
  markGallerySourceLoaded,
  resetProgressiveGalleryCacheForTests,
} from "./progressive-gallery-cache"

const cloudinarySource =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg"

describe("progressive gallery delivery", () => {
  afterEach(() => {
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
  })

  it("locks viewport sizing for stable gallery urls", () => {
    const first = resolveGalleryImageDelivery(cloudinarySource)
    const second = resolveGalleryImageDelivery(cloudinarySource)

    expect(first?.fullUrl).toBe(second?.fullUrl)
    expect(first?.placeholderUrl).toContain("w_48")
  })

  it("builds fixed-width cover delivery urls", () => {
    expect(resolveCoverImageDelivery(cloudinarySource, 960)?.fullUrl).toContain(
      "w_960",
    )
    expect(resolveCoverImageDelivery(cloudinarySource, 640)?.fullUrl).toContain(
      "w_640",
    )
  })

  it("prefetches and marks a delivery url as loaded", async () => {
    const decode = vi.fn().mockResolvedValue(undefined)
    const originalImage = globalThis.Image

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      decode = decode

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.()
        })
      }
    }

    globalThis.Image = MockImage as typeof Image

    try {
      await prefetchProgressiveGalleryImage(cloudinarySource)
      expect(
        isGallerySourceLoaded(
          resolveGalleryImageDelivery(cloudinarySource)!.fullUrl,
        ),
      ).toBe(true)
      expect(decode).toHaveBeenCalledOnce()
    } finally {
      globalThis.Image = originalImage
    }
  })

  it("evicts the oldest cached source after the cap is reached", () => {
    for (let index = 0; index < 101; index += 1) {
      markGallerySourceLoaded(`https://example.com/${index}.jpg`)
    }

    expect(isGallerySourceLoaded("https://example.com/0.jpg")).toBe(false)
    expect(isGallerySourceLoaded("https://example.com/100.jpg")).toBe(true)
  })
})
