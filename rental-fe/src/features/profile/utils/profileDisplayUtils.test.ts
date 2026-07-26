import { describe, expect, it } from "vitest"

import {
  buildProfileShareMessage,
  normalizeProfileDisplayName,
  normalizeProfileId,
} from "./profileDisplayUtils"

describe("normalizeProfileDisplayName", () => {
  it("trims valid names and falls back for blank values", () => {
    expect(normalizeProfileDisplayName(" Nang ")).toBe("Nang")
    expect(normalizeProfileDisplayName("   ", "Lister")).toBe("Lister")
    expect(normalizeProfileDisplayName(null)).toBe("Profile")
  })
})

describe("normalizeProfileId", () => {
  it("returns trimmed ids and empty string for invalid values", () => {
    expect(normalizeProfileId(" agent-1 ")).toBe("agent-1")
    expect(normalizeProfileId("")).toBe("")
    expect(normalizeProfileId(undefined)).toBe("")
  })
})

describe("buildProfileShareMessage", () => {
  it("includes the profile url when present", () => {
    expect(buildProfileShareMessage("https://example.com/listers/agent-1")).toBe(
      "Hi, I found your rental profile: https://example.com/listers/agent-1",
    )
  })

  it("falls back safely when the url is blank", () => {
    expect(buildProfileShareMessage("   ")).toBe(
      "Hi, I found your rental profile.",
    )
  })
})
