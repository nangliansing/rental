import { describe, expect, it } from "vitest"

import {
  MOBILE_NAV_BAR_HEIGHT_PX,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS,
} from "./mobileNavLayout"

describe("mobileNavLayout", () => {
  it("matches the AppNavigation mobile tab bar height", () => {
    expect(MOBILE_NAV_BAR_HEIGHT_PX).toBe(64)
  })

  it("clears the mobile nav in scroll containers and drops padding on desktop", () => {
    expect(MOBILE_NAV_SCROLL_PADDING_CLASS).toBe("pb-20 md:pb-0")
    expect(MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS).toBe("pb-20")
  })
})
