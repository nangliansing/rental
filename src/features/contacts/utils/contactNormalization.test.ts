import { describe, expect, it } from "vitest"

import {
  normalizeContactOwnerName,
  normalizeContactText,
  normalizeHttpUrl,
  normalizePhoneDigits,
  normalizeTelHref,
  normalizeViberHref,
} from "./contactNormalization"

describe("contactNormalization", () => {
  it("normalizes optional contact text defensively", () => {
    expect(normalizeContactText("  hello ")).toBe("hello")
    expect(normalizeContactText("")).toBeNull()
    expect(normalizeContactText("   ")).toBeNull()
    expect(normalizeContactText(null)).toBeNull()
    expect(normalizeContactText(undefined)).toBeNull()
    expect(normalizeContactText(123)).toBeNull()
  })

  it("falls back to a safe contact owner label", () => {
    expect(normalizeContactOwnerName("  Nang  ")).toBe("Nang")
    expect(normalizeContactOwnerName("")).toBe("Lister")
    expect(normalizeContactOwnerName(undefined)).toBe("Lister")
  })

  it("normalizes phone digits and tel links", () => {
    expect(normalizePhoneDigits("+66 81-234-5678")).toBe("66812345678")
    expect(normalizeTelHref("0812 345 678")).toBe("tel:0812345678")
    expect(normalizeTelHref("++--")).toBeNull()
  })

  it("accepts only http(s) URLs", () => {
    expect(normalizeHttpUrl("https://line.me/ti/p/abc")).toBe(
      "https://line.me/ti/p/abc",
    )
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeHttpUrl("not-a-url")).toBeNull()
  })

  it("builds viber links from phone values", () => {
    expect(normalizeViberHref("+66 81-234-5678")).toBe(
      "viber://chat?number=%2B66812345678",
    )
    expect(normalizeViberHref("++--")).toBeNull()
  })
})
