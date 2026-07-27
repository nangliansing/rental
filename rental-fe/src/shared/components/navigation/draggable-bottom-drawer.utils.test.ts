import { describe, expect, it } from "vitest"

import {
  clampDraggableBottomDrawerOffset,
  DRAG_SNAP_THRESHOLD_PX,
  DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS,
  DRAGGABLE_BOTTOM_DRAWER_SNAPS,
  getNextDraggableBottomDrawerSnap,
  isDraggableBottomDrawerSnap,
  MAX_DRAG_OFFSET_PX,
  normalizeDraggableBottomDrawerSnap,
  resolveDraggableBottomDrawerSnap,
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

    it("uses a custom fallback when provided", () => {
      expect(
        normalizeDraggableBottomDrawerSnap("invalid" as never, "peek"),
      ).toBe("peek")
    })
  })

  describe("getNextDraggableBottomDrawerSnap", () => {
    it.each([
      ["peek", "up", "half"],
      ["half", "up", "full"],
      ["half", "down", "peek"],
      ["full", "down", "half"],
    ] as const)(
      "moves from %s %s to %s",
      (snap, direction, expected) => {
        expect(getNextDraggableBottomDrawerSnap(snap, direction)).toBe(expected)
      },
    )

    it("does not move beyond peek when dragging down", () => {
      expect(getNextDraggableBottomDrawerSnap("peek", "down")).toBe("peek")
    })

    it("does not move beyond full when dragging up", () => {
      expect(getNextDraggableBottomDrawerSnap("full", "up")).toBe("full")
    })
  })

  describe("clampDraggableBottomDrawerOffset", () => {
    it("only allows upward drag at peek", () => {
      expect(clampDraggableBottomDrawerOffset("peek", 120)).toBe(0)
      expect(clampDraggableBottomDrawerOffset("peek", -80)).toBe(-80)
      expect(clampDraggableBottomDrawerOffset("peek", -400)).toBe(
        -MAX_DRAG_OFFSET_PX,
      )
    })

    it("only allows downward drag at full", () => {
      expect(clampDraggableBottomDrawerOffset("full", -120)).toBe(0)
      expect(clampDraggableBottomDrawerOffset("full", 80)).toBe(80)
      expect(clampDraggableBottomDrawerOffset("full", 400)).toBe(
        MAX_DRAG_OFFSET_PX,
      )
    })

    it("allows bidirectional drag at half", () => {
      expect(clampDraggableBottomDrawerOffset("half", 80)).toBe(80)
      expect(clampDraggableBottomDrawerOffset("half", -80)).toBe(-80)
      expect(clampDraggableBottomDrawerOffset("half", 400)).toBe(
        MAX_DRAG_OFFSET_PX,
      )
      expect(clampDraggableBottomDrawerOffset("half", -400)).toBe(
        -MAX_DRAG_OFFSET_PX,
      )
    })

    it("respects a custom max offset", () => {
      expect(clampDraggableBottomDrawerOffset("half", 200, 100)).toBe(100)
      expect(clampDraggableBottomDrawerOffset("half", -200, 100)).toBe(-100)
    })

    it("keeps zero offset at boundaries", () => {
      expect(clampDraggableBottomDrawerOffset("peek", 0)).toBe(0)
      expect(clampDraggableBottomDrawerOffset("half", 0)).toBe(0)
      expect(clampDraggableBottomDrawerOffset("full", 0)).toBe(0)
    })
  })

  describe("resolveDraggableBottomDrawerSnap", () => {
    it.each([
      ["half", -DRAG_SNAP_THRESHOLD_PX - 1, "full"],
      ["half", DRAG_SNAP_THRESHOLD_PX + 1, "peek"],
      ["peek", -DRAG_SNAP_THRESHOLD_PX - 1, "half"],
      ["full", DRAG_SNAP_THRESHOLD_PX + 1, "half"],
    ] as const)(
      "resolves %s with offset %i to %s",
      (snap, offset, expected) => {
        expect(resolveDraggableBottomDrawerSnap(snap, offset)).toBe(expected)
      },
    )

    it("keeps the current snap when drag is within the threshold", () => {
      expect(resolveDraggableBottomDrawerSnap("half", -60)).toBe("half")
      expect(resolveDraggableBottomDrawerSnap("half", 60)).toBe("half")
      expect(resolveDraggableBottomDrawerSnap("half", 0)).toBe("half")
      expect(resolveDraggableBottomDrawerSnap("half", 20)).toBe("half")
      expect(resolveDraggableBottomDrawerSnap("half", -20)).toBe("half")
    })

    it("does not move peek downward or full upward at threshold", () => {
      expect(
        resolveDraggableBottomDrawerSnap("peek", DRAG_SNAP_THRESHOLD_PX + 1),
      ).toBe("peek")
      expect(
        resolveDraggableBottomDrawerSnap("full", -DRAG_SNAP_THRESHOLD_PX - 1),
      ).toBe("full")
    })

    it("respects a custom threshold", () => {
      expect(resolveDraggableBottomDrawerSnap("half", -40, 30)).toBe("full")
      expect(resolveDraggableBottomDrawerSnap("half", 40, 30)).toBe("peek")
      expect(resolveDraggableBottomDrawerSnap("half", 25, 30)).toBe("half")
    })
  })

  describe("shouldHideDraggableBottomDrawerContent", () => {
    it.each([
      ["peek", true, true],
      ["half", true, false],
      ["full", true, false],
      ["peek", false, false],
      ["half", false, false],
      ["full", false, false],
    ] as const)(
      "returns %s for snap=%s hideWhenPeek=%s",
      (snap, hideWhenPeek, expected) => {
        expect(
          shouldHideDraggableBottomDrawerContent(snap, hideWhenPeek),
        ).toBe(expected)
      },
    )
  })

  describe("DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS", () => {
    it("maps every snap to a height class", () => {
      for (const snap of DRAGGABLE_BOTTOM_DRAWER_SNAPS) {
        expect(DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS[snap]).toMatch(/^h-/)
      }
    })
  })
})
