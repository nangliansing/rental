import { describe, expect, it } from "vitest"

import { canUsePersonalActions } from "./canUsePersonalActions"

describe("canUsePersonalActions", () => {
  it("requires an authenticated ACTIVE user after auth has settled", () => {
    expect(
      canUsePersonalActions({
        user: { status: "ACTIVE" },
        isAuthenticated: true,
        isLoading: false,
      }),
    ).toBe(true)
  })

  it.each([
    {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    },
    {
      user: { status: "ACTIVE" },
      isAuthenticated: true,
      isLoading: true,
    },
    {
      user: { status: "PENDING" },
      isAuthenticated: true,
      isLoading: false,
    },
  ])("rejects incomplete personal access (%j)", (auth) => {
    expect(canUsePersonalActions(auth)).toBe(false)
  })
})
