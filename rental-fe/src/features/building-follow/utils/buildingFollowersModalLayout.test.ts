import { describe, expect, it } from "vitest"

import { BUILDING_FOLLOWERS_MODAL_BODY_CLASS } from "./buildingFollowersModalLayout"

describe("buildingFollowersModalLayout", () => {
  it("exports scrollable modal body classes", () => {
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain("overflow-y-auto")
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain("min-h-0")
    expect(BUILDING_FOLLOWERS_MODAL_BODY_CLASS).toContain("flex-1")
  })
})
