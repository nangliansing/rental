
import { describe, expect, it } from "vitest"

import { clampCollapsedLines, hasFormattedText } from "./formatted-text"

describe("formatted-text", () => {
  it("detects non-empty formatted text defensively", () => {
    expect(hasFormattedText("hello")).toBe(true)
    expect(hasFormattedText("  spaced  ")).toBe(true)
    expect(hasFormattedText("   ")).toBe(false)
    expect(hasFormattedText(null)).toBe(false)
    expect(hasFormattedText(undefined)).toBe(false)
  })

  it("clamps collapsed line counts", () => {
    expect(clampCollapsedLines(0)).toBe(1)
    expect(clampCollapsedLines(2.8)).toBe(2)
    expect(clampCollapsedLines(99)).toBe(10)
    expect(clampCollapsedLines(Number.NaN)).toBe(2)
  })
})
