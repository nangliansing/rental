import { describe, expect, it } from "vitest"

import {
  clampSwipeableActionCardIndex,
  resolveSwipeableActionCardIndex,
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
