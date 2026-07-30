import { describe, expect, it } from "vitest"

import {
  clampSwipeableActionCardIndex,
  resolveSwipeableActionCardIndex,
  resolveSwipeableScrollAxisLock,
} from "./SwipeableActionCard"

describe("clampSwipeableActionCardIndex", () => {
  it("keeps in-range indexes", () => {
    expect(clampSwipeableActionCardIndex(0, 3)).toBe(0)
    expect(clampSwipeableActionCardIndex(1, 3)).toBe(1)
    expect(clampSwipeableActionCardIndex(2, 3)).toBe(2)
  })

  it("clamps below and above the range", () => {
    expect(clampSwipeableActionCardIndex(-1, 3)).toBe(0)
    expect(clampSwipeableActionCardIndex(-100, 3)).toBe(0)
    expect(clampSwipeableActionCardIndex(3, 3)).toBe(2)
    expect(clampSwipeableActionCardIndex(99, 3)).toBe(2)
  })

  it("truncates fractional indexes toward zero before clamping", () => {
    expect(clampSwipeableActionCardIndex(1.2, 3)).toBe(1)
    expect(clampSwipeableActionCardIndex(1.9, 3)).toBe(1)
    expect(clampSwipeableActionCardIndex(-0.5, 3)).toBe(0)
  })

  it("defensively handles empty lists and non-finite values", () => {
    expect(clampSwipeableActionCardIndex(2, 0)).toBe(0)
    expect(clampSwipeableActionCardIndex(2, -1)).toBe(0)
    expect(clampSwipeableActionCardIndex(Number.NaN, 3)).toBe(0)
    expect(clampSwipeableActionCardIndex(Number.POSITIVE_INFINITY, 3)).toBe(0)
    expect(clampSwipeableActionCardIndex(Number.NEGATIVE_INFINITY, 3)).toBe(0)
  })

  it("supports a single-page list", () => {
    expect(clampSwipeableActionCardIndex(0, 1)).toBe(0)
    expect(clampSwipeableActionCardIndex(5, 1)).toBe(0)
  })
})

describe("resolveSwipeableScrollAxisLock", () => {
  it("returns null until movement exceeds slop", () => {
    expect(resolveSwipeableScrollAxisLock(0, 0)).toBeNull()
    expect(resolveSwipeableScrollAxisLock(9, 0)).toBeNull()
    expect(resolveSwipeableScrollAxisLock(0, 9)).toBeNull()
  })

  it("prefers horizontal carousel scrolling for dominant x movement", () => {
    expect(resolveSwipeableScrollAxisLock(40, 0)).toBe("x")
    expect(resolveSwipeableScrollAxisLock(20, 10)).toBe("x")
  })

  it("prefers vertical page scrolling for dominant y movement", () => {
    expect(resolveSwipeableScrollAxisLock(0, 40)).toBe("y")
    expect(resolveSwipeableScrollAxisLock(10, 20)).toBe("y")
  })

  it("defensively handles invalid input", () => {
    expect(resolveSwipeableScrollAxisLock(Number.NaN, 40)).toBeNull()
    expect(resolveSwipeableScrollAxisLock(40, Number.POSITIVE_INFINITY)).toBeNull()
    expect(resolveSwipeableScrollAxisLock(40, 0, -1)).toBeNull()
  })

  it("respects a custom slop threshold", () => {
    expect(resolveSwipeableScrollAxisLock(3, 0, 16)).toBeNull()
    expect(resolveSwipeableScrollAxisLock(5, 0, 16)).toBe("x")
  })

  it("locks vertically when horizontal and vertical deltas are equal", () => {
    expect(resolveSwipeableScrollAxisLock(20, 20)).toBe("y")
    expect(resolveSwipeableScrollAxisLock(-20, -20)).toBe("y")
  })
})

describe("resolveSwipeableActionCardIndex", () => {
  it("resolves snapped pages from scroll metrics", () => {
    expect(resolveSwipeableActionCardIndex(0, 320, 3)).toBe(0)
    expect(resolveSwipeableActionCardIndex(159, 320, 3)).toBe(0)
    expect(resolveSwipeableActionCardIndex(160, 320, 3)).toBe(1)
    expect(resolveSwipeableActionCardIndex(480, 320, 3)).toBe(2)
    expect(resolveSwipeableActionCardIndex(640, 320, 3)).toBe(2)
  })

  it("clamps overflow scroll positions", () => {
    expect(resolveSwipeableActionCardIndex(5000, 320, 2)).toBe(1)
    expect(resolveSwipeableActionCardIndex(-50, 320, 2)).toBe(0)
  })

  it("returns null for invalid metrics", () => {
    expect(resolveSwipeableActionCardIndex(100, 0, 3)).toBeNull()
    expect(resolveSwipeableActionCardIndex(100, -10, 3)).toBeNull()
    expect(resolveSwipeableActionCardIndex(100, 320, 0)).toBeNull()
    expect(resolveSwipeableActionCardIndex(Number.NaN, 320, 3)).toBeNull()
    expect(
      resolveSwipeableActionCardIndex(100, Number.NaN, 3),
    ).toBeNull()
    expect(
      resolveSwipeableActionCardIndex(Number.POSITIVE_INFINITY, 320, 3),
    ).toBeNull()
    expect(
      resolveSwipeableActionCardIndex(Number.NEGATIVE_INFINITY, 320, 3),
    ).toBeNull()
  })
})
