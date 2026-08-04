import { describe, expect, it } from "vitest"

import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/shared/components/navigation/mobileNavLayout"

import { BUILDING_FOLLOWERS_MODAL_BODY_CLASS } from "./buildingFollowersModalLayout"

describe("buildingFollowersModalLayout", () => {
  it("keeps scrollable modal body classes with mobile nav clearance", () => {
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain("overflow-y-auto")
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain("min-h-0")
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain("flex-1")
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain(
      MOBILE_NAV_SCROLL_PADDING_CLASS,
    )
  })
})
