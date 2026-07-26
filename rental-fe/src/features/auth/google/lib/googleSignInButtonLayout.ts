import type { GoogleButtonOptions } from "../types"

export const GOOGLE_SIGN_IN_BUTTON_MAX_WIDTH = 400

/** Fits Google's large personalized button (name + email) without clipping. */
export const GOOGLE_SIGN_IN_SLOT_HEIGHT_PX = 72

/** GIS may swap standard → personalized shortly after the first paint. */
export const GOOGLE_SIGN_IN_STABLE_MS = 450

export const GOOGLE_SIGN_IN_BUTTON_OPTIONS = {
  type: "standard",
  theme: "outline",
  size: "large",
  text: "continue_with",
  shape: "rectangular",
  logo_alignment: "left",
} satisfies Omit<GoogleButtonOptions, "width">

export function clampGoogleSignInButtonWidth(width: number) {
  return Math.min(
    GOOGLE_SIGN_IN_BUTTON_MAX_WIDTH,
    Math.max(1, Math.floor(width)),
  )
}
