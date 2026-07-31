import { describe, expect, it } from "vitest"

import { getRouteTitle } from "@/shared/components/navigation/route-title"

describe("getRouteTitle", () => {
  it("returns building details for standalone building pages", () => {
    expect(getRouteTitle("/buildings/building-1")).toBe("Building details")
    expect(getRouteTitle("/buildings/building-1/edit")).toBe("Edit building")
  })
})
