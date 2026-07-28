import { describe, expect, it } from "vitest"

import {
  applyDraggableBottomDrawerRubberBand,
  areDraggableBottomDrawerMetricsEqual,
  clampDraggableBottomDrawerTranslateY,
  DRAGGABLE_BOTTOM_DRAWER_DEFAULT_VIEWPORT_HEIGHT,
  DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS,
  DRAGGABLE_BOTTOM_DRAWER_SNAPS,
  computeDraggableBottomDrawerReleaseVelocity,
  getDraggableBottomDrawerMetrics,
  getDraggableBottomDrawerScrollEndSpacerPx,
  getNextDraggableBottomDrawerSnap,
  isDraggableBottomDrawerSnap,
  normalizeDraggableBottomDrawerSnap,
  resolveClosestDraggableBottomDrawerSnap,
  resolveSettledDraggableBottomDrawerSnap,
  shouldDraggableBottomDrawerHandleContentDrag,
  shouldHideDraggableBottomDrawerContent,
} from "./draggable-bottom-drawer.utils"

describe("draggable-bottom-drawer.utils", () => {
  describe("isDraggableBottomDrawerSnap", () => {
    it.each(DRAGGABLE_BOTTOM_DRAWER_SNAPS)("accepts valid snap %s", (snap) => {
      expect(isDraggableBottomDrawerSnap(snap)).toBe(true)
    })

    it("rejects unknown snap values", () => {
      expect(isDraggableBottomDrawerSnap("open")).toBe(false)
      expect(isDraggableBottomDrawerSnap("")).toBe(false)
    })
  })

  describe("normalizeDraggableBottomDrawerSnap", () => {
    it("returns valid snaps unchanged", () => {
      expect(normalizeDraggableBottomDrawerSnap("peek")).toBe("peek")
      expect(normalizeDraggableBottomDrawerSnap("half")).toBe("half")
      expect(normalizeDraggableBottomDrawerSnap("full")).toBe("full")
    })

    it("falls back to half for invalid snaps", () => {
      expect(normalizeDraggableBottomDrawerSnap("invalid" as never)).toBe("half")
    })
  })

  describe("getDraggableBottomDrawerMetrics", () => {
    it("derives transform offsets from viewport height", () => {
      const metrics = getDraggableBottomDrawerMetrics(800)

      expect(metrics.shellHeight).toBe(720)
      expect(metrics.snapOffsets).toEqual({
        full: 0,
        half: 320,
        peek: 592,
      })
      expect(metrics.scrollEndSpacerPx).toEqual({
        full: 64,
        half: 384,
        peek: 656,
      })
    })
  })

  describe("getDraggableBottomDrawerScrollEndSpacerPx", () => {
    it("reads precomputed spacer values from metrics", () => {
      const metrics = getDraggableBottomDrawerMetrics(800)

      expect(getDraggableBottomDrawerScrollEndSpacerPx("full", metrics)).toBe(64)
      expect(getDraggableBottomDrawerScrollEndSpacerPx("half", metrics)).toBe(384)
      expect(getDraggableBottomDrawerScrollEndSpacerPx("peek", metrics)).toBe(656)
    })
  })

  describe("areDraggableBottomDrawerMetricsEqual", () => {
    it("returns true for equivalent metrics", () => {
      const left = getDraggableBottomDrawerMetrics(800)
      const right = getDraggableBottomDrawerMetrics(800)

      expect(areDraggableBottomDrawerMetricsEqual(left, right)).toBe(true)
    })

    it("returns false when snap offsets differ", () => {
      const left = getDraggableBottomDrawerMetrics(800)
      const right = getDraggableBottomDrawerMetrics(900)

      expect(areDraggableBottomDrawerMetricsEqual(left, right)).toBe(false)
    })
  })

  describe("clampDraggableBottomDrawerTranslateY", () => {
    it("clamps between full and peek offsets", () => {
      const metrics = getDraggableBottomDrawerMetrics(800)

      expect(clampDraggableBottomDrawerTranslateY(-40, metrics)).toBe(0)
      expect(clampDraggableBottomDrawerTranslateY(80, metrics)).toBe(80)
      expect(clampDraggableBottomDrawerTranslateY(700, metrics)).toBe(592)
    })
  })

  describe("applyDraggableBottomDrawerRubberBand", () => {
    it("adds resistance beyond the hard limits", () => {
      const metrics = getDraggableBottomDrawerMetrics(800)

      expect(applyDraggableBottomDrawerRubberBand(-40, metrics)).toBe(-14)
      expect(applyDraggableBottomDrawerRubberBand(620, metrics)).toBe(601.8)
    })
  })

  describe("getNextDraggableBottomDrawerSnap", () => {
    it.each([
      ["peek", "up", "half"],
      ["half", "up", "full"],
      ["half", "down", "peek"],
      ["full", "down", "half"],
    ] as const)("moves from %s %s to %s", (snap, direction, expected) => {
      expect(getNextDraggableBottomDrawerSnap(snap, direction)).toBe(expected)
    })
  })

  describe("resolveClosestDraggableBottomDrawerSnap", () => {
    const metrics = getDraggableBottomDrawerMetrics(800)

    it.each([
      [0, "full"],
      [160, "half"],
      [320, "half"],
      [470, "peek"],
      [592, "peek"],
    ] as const)("resolves %ipx to %s", (translateY, expectedSnap) => {
      expect(resolveClosestDraggableBottomDrawerSnap(translateY, metrics)).toBe(
        expectedSnap,
      )
    })

    it("prefers the current snap when release is near a detent", () => {
      expect(
        resolveClosestDraggableBottomDrawerSnap(360, metrics, "half"),
      ).toBe("half")
    })
  })

  describe("resolveSettledDraggableBottomDrawerSnap", () => {
    const metrics = getDraggableBottomDrawerMetrics(800)

    it("uses fling direction to skip to the next snap", () => {
      expect(
        resolveSettledDraggableBottomDrawerSnap("peek", 580, -0.8, metrics),
      ).toBe("half")
      expect(
        resolveSettledDraggableBottomDrawerSnap("half", 300, -0.8, metrics),
      ).toBe("full")
      expect(
        resolveSettledDraggableBottomDrawerSnap("full", 40, 0.8, metrics),
      ).toBe("half")
    })

    it("ignores velocity on short gestures", () => {
      expect(computeDraggableBottomDrawerReleaseVelocity(200, 120, 20)).toBe(0)
    })

    it("uses sticky closest snap on slow release", () => {
      expect(
        resolveSettledDraggableBottomDrawerSnap("half", 300, 0, metrics),
      ).toBe("half")
      expect(
        resolveSettledDraggableBottomDrawerSnap("half", 520, 0, metrics),
      ).toBe("peek")
    })
  })

  describe("shouldDraggableBottomDrawerHandleContentDrag", () => {
    it.each([
      ["half", 0, -20, true],
      ["half", 120, -20, true],
      ["half", 120, 20, false],
      ["half", 0, 20, true],
      ["full", 0, 20, true],
      ["full", 120, 20, false],
      ["full", 120, -20, false],
      ["peek", 0, -20, true],
      ["peek", 0, 20, true],
    ] as const)(
      "snap=%s scrollTop=%i deltaY=%i -> %s",
      (snap, scrollTop, deltaY, expected) => {
        expect(
          shouldDraggableBottomDrawerHandleContentDrag(snap, scrollTop, deltaY),
        ).toBe(expected)
      },
    )
  })

  describe("shouldHideDraggableBottomDrawerContent", () => {
    it.each([
      ["peek", true, true],
      ["half", true, false],
      ["full", true, false],
    ] as const)(
      "returns %s for snap=%s hideWhenPeek=%s",
      (snap, hideWhenPeek, expected) => {
        expect(
          shouldHideDraggableBottomDrawerContent(snap, hideWhenPeek),
        ).toBe(expected)
      },
    )
  })

  describe("DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS", () => {
    it("uses a stable full shell height", () => {
      expect(DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS).toBe("h-[90dvh]")
    })
  })
})
