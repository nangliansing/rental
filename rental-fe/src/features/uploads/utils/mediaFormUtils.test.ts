import { describe, expect, it } from "vitest"

import { areMediaEqual } from "./mediaFormUtils"

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
}

describe("areMediaEqual", () => {
  it("treats matching media as equal", () => {
    expect(areMediaEqual(sampleProfilePhoto, { ...sampleProfilePhoto })).toBe(
      true,
    )
  })

  it("treats null pairs as equal", () => {
    expect(areMediaEqual(null, null)).toBe(true)
  })

  it("detects publicId or secureUrl differences", () => {
    expect(
      areMediaEqual(sampleProfilePhoto, {
        ...sampleProfilePhoto,
        publicId: "users/other-photo",
      }),
    ).toBe(false)
    expect(
      areMediaEqual(sampleProfilePhoto, {
        ...sampleProfilePhoto,
        secureUrl: "https://res.cloudinary.com/demo/image/upload/other.jpg",
      }),
    ).toBe(false)
  })

  it("detects null versus media mismatches", () => {
    expect(areMediaEqual(null, sampleProfilePhoto)).toBe(false)
    expect(areMediaEqual(sampleProfilePhoto, null)).toBe(false)
  })
})
