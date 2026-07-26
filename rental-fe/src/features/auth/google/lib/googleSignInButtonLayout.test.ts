import { describe, expect, it } from "vitest"

import {
  GOOGLE_SIGN_IN_BUTTON_MAX_WIDTH,
  clampGoogleSignInButtonWidth,
} from "./googleSignInButtonLayout"

describe("clampGoogleSignInButtonWidth", () => {
  it("floors fractional widths and enforces Google's 400px maximum", () => {
    expect(clampGoogleSignInButtonWidth(320.9)).toBe(320)
    expect(clampGoogleSignInButtonWidth(GOOGLE_SIGN_IN_BUTTON_MAX_WIDTH)).toBe(
      GOOGLE_SIGN_IN_BUTTON_MAX_WIDTH,
    )
    expect(clampGoogleSignInButtonWidth(480)).toBe(
      GOOGLE_SIGN_IN_BUTTON_MAX_WIDTH,
    )
  })

  it("never returns zero or negative widths", () => {
    expect(clampGoogleSignInButtonWidth(0)).toBe(1)
    expect(clampGoogleSignInButtonWidth(-12)).toBe(1)
  })
})
