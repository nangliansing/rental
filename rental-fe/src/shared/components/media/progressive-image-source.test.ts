import { describe, expect, it } from "vitest"

import {
  COVER_ABSOLUTE_MAX_WIDTH,
  COVER_CARD_MAX_WIDTH,
  resolveCoverImageDelivery,
} from "./gallery-image-delivery"
import {
  isUsableProgressiveImageSource,
  normalizeProgressiveImageSource,
} from "./progressive-image-source"

const cloudinarySource =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg"

describe("progressive image source", () => {
  it("normalizes string sources defensively", () => {
    expect(normalizeProgressiveImageSource("  https://example.com/a.jpg  ")).toBe(
      "https://example.com/a.jpg",
    )
    expect(normalizeProgressiveImageSource(null)).toBe("")
    expect(normalizeProgressiveImageSource(undefined)).toBe("")
    expect(isUsableProgressiveImageSource("   ")).toBe(false)
  })
})

describe("cover image delivery defenses", () => {
  it("falls back to card width for invalid max widths", () => {
    expect(resolveCoverImageDelivery(cloudinarySource, Number.NaN)?.fullUrl).toContain(
      `w_${COVER_CARD_MAX_WIDTH}`,
    )
    expect(resolveCoverImageDelivery(cloudinarySource, -1)?.fullUrl).toContain(
      `w_${COVER_CARD_MAX_WIDTH}`,
    )
  })

  it("caps cover delivery width", () => {
    expect(
      resolveCoverImageDelivery(cloudinarySource, 9999)?.fullUrl,
    ).toContain(`w_${COVER_ABSOLUTE_MAX_WIDTH}`)
  })

  it("returns null for unusable sources", () => {
    expect(resolveCoverImageDelivery("   ")).toBeNull()
    expect(resolveCoverImageDelivery(null)).toBeNull()
  })
})
