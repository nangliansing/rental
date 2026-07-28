import { describe, expect, it } from "vitest"

import { normalizeDialogErrorMessage } from "./normalizeDialogErrorMessage"

describe("normalizeDialogErrorMessage", () => {
  it("trims string errors", () => {
    expect(normalizeDialogErrorMessage("  Failed to save.  ")).toBe(
      "Failed to save.",
    )
  })

  it("returns an empty string for blank or non-string values", () => {
    expect(normalizeDialogErrorMessage("   ")).toBe("")
    expect(normalizeDialogErrorMessage("")).toBe("")
    expect(normalizeDialogErrorMessage(null)).toBe("")
    expect(normalizeDialogErrorMessage(undefined)).toBe("")
  })
})
