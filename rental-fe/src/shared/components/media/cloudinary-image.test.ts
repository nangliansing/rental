import { describe, expect, it } from "vitest"

import {
  createCloudinaryGalleryImage,
  parseCloudinaryDeliveryUrl,
} from "./cloudinary-image"

describe("parseCloudinaryDeliveryUrl", () => {
  it("parses a versioned delivery url", () => {
    expect(
      parseCloudinaryDeliveryUrl(
        "https://res.cloudinary.com/demo/image/upload/v123/listing/photo.jpg",
      ),
    ).toEqual({
      cloudName: "demo",
      publicId: "listing/photo.jpg",
      version: 123,
    })
  })

  it("strips existing transforms before parsing the public id", () => {
    expect(
      parseCloudinaryDeliveryUrl(
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v123/listing/photo.jpg",
      ),
    ).toEqual({
      cloudName: "demo",
      publicId: "listing/photo.jpg",
      version: 123,
    })
  })

  it("returns null for non-cloudinary urls", () => {
    expect(parseCloudinaryDeliveryUrl("https://example.com/photo.jpg")).toBeNull()
  })
})

describe("createCloudinaryGalleryImage", () => {
  it("builds an optimized delivery url from a cloudinary source", () => {
    const image = createCloudinaryGalleryImage(
      "https://res.cloudinary.com/demo/image/upload/v1/photo.jpg",
      640,
    )

    expect(image?.toURL()).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/c_limit,w_640\/f_auto\/q_auto\/v1\/photo\.jpg/,
    )
  })
})
