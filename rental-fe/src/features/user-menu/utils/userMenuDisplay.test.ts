import { describe, expect, it } from "vitest"

import {
  getUserMenuDisplayName,
  getUserMenuEmail,
  isUserMenuAuthUser,
  normalizeUserMenuUserId,
} from "./userMenuDisplay"

describe("userMenuDisplay", () => {
  it("normalizes user ids and display fields defensively", () => {
    expect(normalizeUserMenuUserId(" user-1 ")).toBe("user-1")
    expect(normalizeUserMenuUserId(null)).toBe("")
    expect(getUserMenuDisplayName(" Jane ")).toBe("Jane")
    expect(getUserMenuDisplayName("   ")).toBe("Account")
    expect(getUserMenuEmail(" jane@example.com ")).toBe("jane@example.com")
    expect(getUserMenuEmail("")).toBeNull()
  })

  it("validates auth users before rendering the menu", () => {
    expect(
      isUserMenuAuthUser({
        _id: "user-1",
        name: "Jane",
        email: "jane@example.com",
        authProvider: "GOOGLE",
        role: "USER",
        status: "ACTIVE",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-21T00:00:00.000Z",
      }),
    ).toBe(true)
    expect(isUserMenuAuthUser({ _id: " ", name: "Jane", email: "jane@example.com" })).toBe(
      false,
    )
  })
})
