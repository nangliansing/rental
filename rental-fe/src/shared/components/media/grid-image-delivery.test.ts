import { describe, expect, it } from "vitest"

import {
  GRID_COVER_PLACEHOLDER_WIDTH,
  GRID_COVER_RESPONSIVE_WIDTHS,
  GRID_COVER_SIZES,
  resolveGridCoverImageDelivery,
} from "./grid-image-delivery"

describe("grid image delivery", () => {
  const source =
    "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg"

  it("builds a capped responsive srcset and tiny blur placeholder for Cloudinary", () => {
    const delivery = resolveGridCoverImageDelivery(source)

    expect(delivery).toEqual({
      cacheKey: source,
      src: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_480/v123/listing/photo.jpg",
      srcSet: [
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_240/v123/listing/photo.jpg 240w",
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/v123/listing/photo.jpg 320w",
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_480/v123/listing/photo.jpg 480w",
      ].join(", "),
      placeholderUrl:
        "https://res.cloudinary.com/demo/image/upload/c_limit,w_32,q_10,e_blur:200,f_auto/v123/listing/photo.jpg",
    })
    expect(GRID_COVER_RESPONSIVE_WIDTHS).toEqual([240, 320, 480])
    expect(GRID_COVER_PLACEHOLDER_WIDTH).toBe(32)
    expect(GRID_COVER_SIZES).toBe("(min-width: 640px) 33vw, 50vw")
  })

  it("skips the blur placeholder when a dominant color will be used", () => {
    expect(
      resolveGridCoverImageDelivery(source, { useBlurPlaceholder: false }),
    ).toMatchObject({
      placeholderUrl: null,
    })
  })

  it("passes external sources through without a srcset or blur placeholder", () => {
    const externalSource = "https://example.com/listing.jpg"

    expect(resolveGridCoverImageDelivery(externalSource)).toEqual({
      cacheKey: externalSource,
      src: externalSource,
      srcSet: undefined,
      placeholderUrl: null,
    })
  })

  it("rejects empty sources", () => {
    expect(resolveGridCoverImageDelivery("   ")).toBeNull()
    expect(resolveGridCoverImageDelivery(null)).toBeNull()
  })
})
