import { describe, expect, it } from "vitest"

import {
  buildAccountProfileFormValues,
  buildChangedAccountProfileValues,
  isAccountProfileFormValid,
  normalizeAccountProfileFormValues,
} from "./accountProfileFormUtils"

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

const alternateProfilePhoto = {
  ...sampleProfilePhoto,
  publicId: "users/alternate-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/alternate.jpg",
}

describe("accountProfileFormUtils", () => {
  it("builds and normalizes form values", () => {
    expect(
      normalizeAccountProfileFormValues(
        buildAccountProfileFormValues({ name: "  Jane Doe  " }),
      ),
    ).toEqual({
      name: "Jane Doe",
      profilePhoto: null,
    })
  })

  it("detects changed name and profilePhoto values", () => {
    const initial = buildAccountProfileFormValues({
      name: "Before",
      profilePhoto: null,
    })
    const current = normalizeAccountProfileFormValues({
      name: "After",
      profilePhoto: sampleProfilePhoto,
    })

    expect(buildChangedAccountProfileValues(initial, current)).toEqual({
      name: "After",
      profilePhoto: sampleProfilePhoto,
    })
  })

  it("detects name-only and profilePhoto-only changes", () => {
    const initial = normalizeAccountProfileFormValues(
      buildAccountProfileFormValues({
        name: "Before",
        profilePhoto: sampleProfilePhoto,
      }),
    )

    expect(
      buildChangedAccountProfileValues(initial, {
        ...initial,
        name: "After",
      }),
    ).toEqual({ name: "After" })

    expect(
      buildChangedAccountProfileValues(initial, {
        ...initial,
        profilePhoto: alternateProfilePhoto,
      }),
    ).toEqual({ profilePhoto: alternateProfilePhoto })
  })

  it("detects clearing profilePhoto with null", () => {
    const initial = normalizeAccountProfileFormValues(
      buildAccountProfileFormValues({
        name: "Jane Doe",
        profilePhoto: sampleProfilePhoto,
      }),
    )

    expect(
      buildChangedAccountProfileValues(initial, {
        ...initial,
        profilePhoto: null,
      }),
    ).toEqual({ profilePhoto: null })
  })

  it("returns an empty patch when nothing changed", () => {
    const values = buildAccountProfileFormValues({
      name: "Same Name",
      profilePhoto: sampleProfilePhoto,
    })

    expect(
      buildChangedAccountProfileValues(
        normalizeAccountProfileFormValues(values),
        normalizeAccountProfileFormValues(values),
      ),
    ).toEqual({})
  })

  it("treats equivalent media as unchanged even with different metadata", () => {
    const initial = normalizeAccountProfileFormValues(
      buildAccountProfileFormValues({
        name: "Jane Doe",
        profilePhoto: sampleProfilePhoto,
      }),
    )

    expect(
      buildChangedAccountProfileValues(initial, {
        ...initial,
        profilePhoto: { ...sampleProfilePhoto, alt: "Different alt" },
      }),
    ).toEqual({})
  })

  it("requires a non-empty trimmed name", () => {
    expect(isAccountProfileFormValid({ name: "Jane", profilePhoto: null })).toBe(
      true,
    )
    expect(isAccountProfileFormValid({ name: "   ", profilePhoto: null })).toBe(
      false,
    )
    expect(isAccountProfileFormValid({ name: "", profilePhoto: null })).toBe(
      false,
    )
  })
})
