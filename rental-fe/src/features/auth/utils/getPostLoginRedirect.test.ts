import { describe, expect, it } from "vitest"

import { getPostLoginRedirect } from "./getPostLoginRedirect"

describe("getPostLoginRedirect", () => {
  it("sends new users to profile setup regardless of redirect", () => {
    expect(
      getPostLoginRedirect({
        isNewUser: true,
        requestedRedirect: "/listings/new?buildingId=abc",
      }),
    ).toBe("/profile")
  })

  it("honors safe redirects for returning users", () => {
    expect(
      getPostLoginRedirect({
        isNewUser: false,
        requestedRedirect: "/listings/new?buildingId=abc",
      }),
    ).toBe("/listings/new?buildingId=abc")
  })

  it("falls back to profile when returning users have an unsafe redirect", () => {
    expect(
      getPostLoginRedirect({
        isNewUser: false,
        requestedRedirect: "https://evil.example",
      }),
    ).toBe("/profile")
  })
})
