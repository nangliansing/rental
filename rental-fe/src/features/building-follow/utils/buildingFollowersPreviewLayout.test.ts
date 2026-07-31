import { describe, expect, it } from "vitest"

import {
  BUILDING_FOLLOWERS_PREVIEW_AVATAR_OVERLAP_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_BUTTON_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_COMPACT_AVATAR_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_EMPTY_TEXT_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_SOCIAL_PROOF_CLASS,
} from "./buildingFollowersPreviewLayout"

describe("buildingFollowersPreviewLayout", () => {
  it("keeps preview row layout classes aligned for skeleton and button states", () => {
    expect(BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS).toContain("items-center")
    expect(BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS).toContain("gap-2.5")
    expect(BUILDING_FOLLOWERS_PREVIEW_BUTTON_CLASS).toContain(
      BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS,
    )
  })

  it("exports compact avatar and text styling tokens", () => {
    expect(BUILDING_FOLLOWERS_PREVIEW_COMPACT_AVATAR_CLASS).toContain("h-6")
    expect(BUILDING_FOLLOWERS_PREVIEW_AVATAR_OVERLAP_CLASS).toBe("-ml-1.5")
    expect(BUILDING_FOLLOWERS_PREVIEW_SOCIAL_PROOF_CLASS).toContain("flex-1")
    expect(BUILDING_FOLLOWERS_PREVIEW_EMPTY_TEXT_CLASS).toContain("text-slate-500")
  })
})
