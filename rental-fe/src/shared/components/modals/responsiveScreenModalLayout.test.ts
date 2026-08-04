import { describe, expect, it } from "vitest"

import {
  getResponsiveScreenModalPanelClass,
  RESPONSIVE_SCREEN_MODAL_BACKDROP_CLASS,
} from "./responsiveScreenModalLayout"

describe("responsiveScreenModalLayout", () => {
  it("returns full-screen mobile classes for each modal size", () => {
    expect(getResponsiveScreenModalPanelClass("default")).toContain("h-dvh")
    expect(getResponsiveScreenModalPanelClass("default")).toContain("md:max-w-2xl")
    expect(getResponsiveScreenModalPanelClass("wide")).toContain("md:max-w-4xl")
  })

  it("stacks above DialogShell content so nested pickers stay visible", () => {
    expect(RESPONSIVE_SCREEN_MODAL_BACKDROP_CLASS).toContain("z-[1100]")
  })
})
