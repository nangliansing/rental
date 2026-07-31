import { describe, expect, it } from "vitest"

import {
  buildStandaloneNavigationState,
  getReturnToFromLocation,
  getStandaloneNavigationState,
} from "./standaloneNavigation"

describe("standaloneNavigation", () => {
  it("builds and reads returnTo navigation state", () => {
    expect(buildStandaloneNavigationState("/buildings/building-1")).toEqual({
      returnTo: "/buildings/building-1",
    })
    expect(getReturnToFromLocation({ returnTo: "/buildings/building-1" })).toBe(
      "/buildings/building-1",
    )
    expect(getStandaloneNavigationState({ returnTo: "/buildings/building-1" })).toEqual({
      returnTo: "/buildings/building-1",
    })
  })

  it("reuses valid standalone navigation state", () => {
    expect(getStandaloneNavigationState({ returnTo: "/buildings/a" })).toEqual({
      returnTo: "/buildings/a",
    })
    expect(getStandaloneNavigationState({ extra: true, returnTo: "/x" })).toEqual({
      returnTo: "/x",
    })
  })

  it("ignores blank and malformed state", () => {
    expect(buildStandaloneNavigationState("   ")).toBeUndefined()
    expect(getReturnToFromLocation(null)).toBeNull()
    expect(getReturnToFromLocation({ returnTo: 42 })).toBeNull()
    expect(getStandaloneNavigationState(undefined)).toBeUndefined()
  })
})
