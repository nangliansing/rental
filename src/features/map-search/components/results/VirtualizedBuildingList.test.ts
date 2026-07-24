import { describe, expect, it } from "vitest"

import {
  BUILDING_LIST_VIRTUALIZATION_THRESHOLD,
  shouldVirtualizeBuildingList,
} from "../../utils/building-list-virtualization"

describe("shouldVirtualizeBuildingList", () => {
  it("keeps small collections on the simpler rendering path", () => {
    expect(
      shouldVirtualizeBuildingList(
        BUILDING_LIST_VIRTUALIZATION_THRESHOLD,
        true,
      ),
    ).toBe(false)
  })

  it("virtualizes long collections when a panel scroll root is available", () => {
    expect(
      shouldVirtualizeBuildingList(
        BUILDING_LIST_VIRTUALIZATION_THRESHOLD + 1,
        true,
      ),
    ).toBe(true)
  })

  it("does not virtualize without an external scroll root", () => {
    expect(shouldVirtualizeBuildingList(100, false)).toBe(false)
  })
})
