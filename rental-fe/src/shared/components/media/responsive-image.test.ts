import { describe, expect, it } from "vitest"

import {
  buildCloudinaryImageUrl,
  buildCloudinaryPlaceholderUrl,
  buildResponsiveImageSrcSet,
  resolveGalleryFullWidth,
} from "./responsive-image"

describe("responsive Cloudinary images", () => {
  const source =
    "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg"

  it("adds bounded automatic format and quality transformations", () => {
    expect(buildCloudinaryImageUrl(source, 640)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v123/listing/photo.jpg",
    )
  })

  it("creates a sorted, deduplicated srcset", () => {
    expect(buildResponsiveImageSrcSet(source, [640, 320, 640])).toBe(
      [
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_320/v123/listing/photo.jpg 320w",
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v123/listing/photo.jpg 640w",
      ].join(", "),
    )
  })

  it("leaves local and third-party URLs unchanged", () => {
    const externalSource = "https://example.com/listing.jpg"

    expect(buildCloudinaryImageUrl(externalSource, 640)).toBe(externalSource)
    expect(buildResponsiveImageSrcSet(externalSource)).toBeUndefined()
    expect(buildCloudinaryPlaceholderUrl(externalSource)).toBe(externalSource)
  })

  it("builds a tiny blurred placeholder transformation", () => {
    expect(buildCloudinaryPlaceholderUrl(source)).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_limit,w_48,q_10,e_blur:200,f_auto/v123/listing/photo.jpg",
    )
  })

  it("caps gallery width to the device viewport", () => {
    expect(resolveGalleryFullWidth(390, 2, 1600)).toBe(780)
    expect(resolveGalleryFullWidth(1200, 2, 1600)).toBe(1600)
  })
})
