import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef, useState, type RefObject } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DraggableBottomDrawer,
  DraggableBottomDrawerDragRegion,
  preventDraggableBottomDrawerPropagation,
  type DraggableBottomDrawerSnap,
} from "./DraggableBottomDrawer"
import {
  DRAGGABLE_BOTTOM_DRAWER_SETTLE_TRANSITION,
  DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS,
  getDraggableBottomDrawerMetrics,
} from "./draggable-bottom-drawer.utils"

const TEST_VIEWPORT_HEIGHT = 800

function mockPointerCapture(element: HTMLElement) {
  element.setPointerCapture = vi.fn()
  element.releasePointerCapture = vi.fn()
  element.hasPointerCapture = vi.fn(() => true)
}

function renderDrawer({
  snap = "half" as DraggableBottomDrawerSnap,
  onSnapChange = vi.fn(),
  hideContentWhenPeek,
  allowContentDrag,
  ariaLabel,
  contentRef,
  useDragRegion = false,
  controlled = false,
}: {
  snap?: DraggableBottomDrawerSnap
  onSnapChange?: (snap: DraggableBottomDrawerSnap) => void
  hideContentWhenPeek?: boolean
  allowContentDrag?: boolean
  ariaLabel?: string
  contentRef?: RefObject<HTMLDivElement | null>
  useDragRegion?: boolean
  controlled?: boolean
} = {}) {
  if (controlled) {
    return render(
      <ControlledDrawer
        initialSnap={snap}
        onSnapChange={onSnapChange}
        hideContentWhenPeek={hideContentWhenPeek}
        ariaLabel={ariaLabel}
        contentRef={contentRef}
        useDragRegion={useDragRegion}
      />,
    )
  }

  return render(
    <DraggableBottomDrawer
      snap={snap}
      onSnapChange={onSnapChange}
      testId="drawer"
      contentClassName="h-40"
      hideContentWhenPeek={hideContentWhenPeek}
      ariaLabel={ariaLabel}
      contentRef={contentRef}
      header={(dragHandle) =>
        useDragRegion ? (
          <DraggableBottomDrawerDragRegion dragHandle={dragHandle}>
            Header
          </DraggableBottomDrawerDragRegion>
        ) : (
          <div data-testid="drawer-header" {...dragHandle}>
            Header
          </div>
        )
      }
    >
      <p>Drawer body</p>
    </DraggableBottomDrawer>,
  )
}

function ControlledDrawer({
  initialSnap,
  onSnapChange,
  hideContentWhenPeek,
  ariaLabel,
  contentRef,
  useDragRegion,
}: {
  initialSnap: DraggableBottomDrawerSnap
  onSnapChange?: (snap: DraggableBottomDrawerSnap) => void
  hideContentWhenPeek?: boolean
  ariaLabel?: string
  contentRef?: RefObject<HTMLDivElement | null>
  useDragRegion?: boolean
}) {
  const [snap, setSnap] = useState(initialSnap)

  return (
    <DraggableBottomDrawer
      snap={snap}
      onSnapChange={(nextSnap) => {
        setSnap(nextSnap)
        onSnapChange?.(nextSnap)
      }}
      testId="drawer"
      contentClassName="h-40"
      hideContentWhenPeek={hideContentWhenPeek}
      ariaLabel={ariaLabel}
      contentRef={contentRef}
      header={(dragHandle) =>
        useDragRegion ? (
          <DraggableBottomDrawerDragRegion dragHandle={dragHandle}>
            Header
          </DraggableBottomDrawerDragRegion>
        ) : (
          <div data-testid="drawer-header" {...dragHandle}>
            Header
          </div>
        )
      }
    >
      <p>Drawer body</p>
    </DraggableBottomDrawer>
  )
}

async function dragHeader(
  user: ReturnType<typeof userEvent.setup>,
  header: HTMLElement,
  fromY: number,
  toY: number,
) {
  mockPointerCapture(header)

  await user.pointer([
    {
      keys: "[MouseLeft>]",
      target: header,
      coords: { clientX: 0, clientY: fromY },
    },
    { coords: { clientX: 0, clientY: toY } },
    { keys: "[/MouseLeft]" },
  ])
}

describe("DraggableBottomDrawer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    )
    vi.stubGlobal("cancelAnimationFrame", vi.fn())

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: TEST_VIEWPORT_HEIGHT,
    })
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: TEST_VIEWPORT_HEIGHT,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("rendering", () => {
    it("uses a fixed shell height for all snaps", () => {
      renderDrawer({ snap: "half" })

      expect(screen.getByTestId("drawer")).toHaveClass(
        DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS,
      )
    })

    it.each(["peek", "half", "full"] as const)(
      "positions the %s snap with a transform offset",
      (snap) => {
        renderDrawer({ snap })

        const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)

        expect(screen.getByTestId("drawer")).toHaveStyle({
          transform: `translate3d(0, ${metrics.snapOffsets[snap]}px, 0)`,
        })
        expect(screen.getByTestId("drawer")).toHaveAttribute("data-snap", snap)
      },
    )

    it("visually hides children at peek while keeping them mounted", () => {
      renderDrawer({ snap: "peek" })

      const content = screen.getByText("Drawer body")
      expect(content).toBeInTheDocument()
      expect(content.closest(".overflow-y-auto")).toHaveAttribute(
        "aria-hidden",
        "true",
      )
      expect(content.closest(".overflow-y-auto")).toHaveClass("invisible")
    })

    it("shows children at half and full", () => {
      const { rerender } = renderDrawer({ snap: "half" })
      expect(screen.getByText("Drawer body")).toBeInTheDocument()

      rerender(
        <DraggableBottomDrawer
          snap="full"
          onSnapChange={vi.fn()}
          testId="drawer"
          header={(dragHandle) => (
            <div data-testid="drawer-header" {...dragHandle}>
              Header
            </div>
          )}
        >
          <p>Drawer body</p>
        </DraggableBottomDrawer>,
      )

      expect(screen.getByText("Drawer body")).toBeInTheDocument()
    })

    it("adds a computed scroll-end spacer below drawer content", () => {
      renderDrawer({ snap: "half" })

      const spacer = screen.getByTestId("drawer-scroll-end-spacer")
      expect(spacer).toHaveClass("shrink-0")
      expect(spacer).toHaveStyle({ height: "384px" })
    })

    it("uses nav clearance only at full open", () => {
      renderDrawer({ snap: "full" })

      expect(screen.getByTestId("drawer-scroll-end-spacer")).toHaveStyle({
        height: "64px",
      })
    })

    it("shows children at peek when hideContentWhenPeek is false", () => {
      renderDrawer({ snap: "peek", hideContentWhenPeek: false })

      expect(screen.getByText("Drawer body")).toBeInTheDocument()
    })

    it("uses a custom aria label", () => {
      renderDrawer({ ariaLabel: "Search results" })

      expect(screen.getByLabelText("Search results")).toBeInTheDocument()
    })

    it("forwards contentRef to the scroll container", () => {
      const contentRef = createRef<HTMLDivElement>()

      renderDrawer({ contentRef, snap: "half" })

      expect(contentRef.current).toBeInstanceOf(HTMLDivElement)
      expect(contentRef.current).toHaveClass("overflow-y-auto")
    })

    it("renders the drag region grab bar", () => {
      renderDrawer({ useDragRegion: true })

      const dragRegion = screen.getByText("Header").closest(".cursor-grab")

      expect(dragRegion).not.toBeNull()
      expect(
        dragRegion?.querySelector("[aria-hidden='true']"),
      ).toBeInTheDocument()
    })
  })

  describe("closest snap on release", () => {
    it("settles to full after dragging up from half past the midpoint", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 200, 10)

      expect(onSnapChange).toHaveBeenCalledOnce()
      expect(onSnapChange).toHaveBeenCalledWith("full")
    })

    it("settles to peek after dragging down from half past the midpoint", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 120, 340)

      expect(onSnapChange).toHaveBeenCalledOnce()
      expect(onSnapChange).toHaveBeenCalledWith("peek")
    })

    it("settles back to half after a small drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 150, 130)

      expect(onSnapChange).not.toHaveBeenCalled()
    })

    it("settles to half after dragging up from peek", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "peek", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 200, 0)

      expect(onSnapChange).toHaveBeenCalledWith("half")
    })

    it("stays at peek after dragging down from peek", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "peek", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 120, 220)

      expect(onSnapChange).not.toHaveBeenCalled()
    })

    it("settles to half after dragging down from full past the midpoint", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange, controlled: true })

      await dragHeader(user, screen.getByTestId("drawer-header"), 120, 340)

      expect(onSnapChange).toHaveBeenCalledWith("half")
      expect(screen.getByTestId("drawer")).toHaveAttribute("data-snap", "half")
    })

    it("stays at full after a small downward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 200, 120)

      expect(onSnapChange).not.toHaveBeenCalled()
    })
  })

  describe("pointer lifecycle", () => {
    it("applies translateY while dragging and settles on release", async () => {
      const user = userEvent.setup()
      renderDrawer({ snap: "half" })

      const header = screen.getByTestId("drawer-header")
      const drawer = screen.getByTestId("drawer")
      const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)
      mockPointerCapture(header)

      expect(drawer).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
      })

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: header,
          coords: { clientX: 0, clientY: 150 },
        },
        { coords: { clientX: 0, clientY: 130 } },
      ])

      expect(drawer).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half - 20}px, 0)`,
      })
      expect(drawer.style.transition).toBe("none")

      await user.pointer([{ keys: "[/MouseLeft]" }])

      expect(drawer).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
      })
      expect(drawer.style.transition).toBe(DRAGGABLE_BOTTOM_DRAWER_SETTLE_TRANSITION)
    })

    it("animates directly to the closest snap without resetting to the old snap", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange, controlled: true })

      const header = screen.getByTestId("drawer-header")
      const drawer = screen.getByTestId("drawer")
      const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)
      mockPointerCapture(header)

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: header,
          coords: { clientX: 0, clientY: 120 },
        },
        { coords: { clientX: 0, clientY: 340 } },
      ])

      expect(drawer).toHaveStyle({
        transform: "translate3d(0, 220px, 0)",
      })

      await user.pointer([{ keys: "[/MouseLeft]" }])

      expect(onSnapChange).toHaveBeenCalledWith("half")
      expect(drawer).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
      })
      expect(drawer).toHaveAttribute("data-snap", "half")
      expect(drawer).not.toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.full}px, 0)`,
      })
    })

    it("resolves to the closest snap on pointer cancel", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange, controlled: true })

      const header = screen.getByTestId("drawer-header")
      const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)
      mockPointerCapture(header)

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: header,
          coords: { clientX: 0, clientY: 200 },
        },
        { coords: { clientX: 0, clientY: 0 } },
      ])

      fireEvent.pointerCancel(header, { pointerId: 1 })

      expect(onSnapChange).toHaveBeenCalledWith("full")
      expect(screen.getByTestId("drawer")).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.full}px, 0)`,
      })
      expect(screen.getByTestId("drawer")).toHaveAttribute("data-snap", "full")
    })

    it("settles back to the current snap on a small pointer cancel", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      const header = screen.getByTestId("drawer-header")
      const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)
      mockPointerCapture(header)

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: header,
          coords: { clientX: 0, clientY: 150 },
        },
        { coords: { clientX: 0, clientY: 130 } },
      ])

      fireEvent.pointerCancel(header, { pointerId: 1 })

      expect(onSnapChange).not.toHaveBeenCalled()
      expect(screen.getByTestId("drawer")).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
      })
    })

    it("ignores non-primary pointer buttons", async () => {
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      const header = screen.getByTestId("drawer-header")
      mockPointerCapture(header)

      fireEvent.pointerDown(header, {
        button: 2,
        clientY: 200,
        pointerId: 1,
      })
      fireEvent.pointerMove(header, { clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(header, { clientY: 100, pointerId: 1 })

      expect(onSnapChange).not.toHaveBeenCalled()
    })

    it("ignores pointer end events from a different pointer id", async () => {
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      const header = screen.getByTestId("drawer-header")
      mockPointerCapture(header)

      fireEvent.pointerDown(header, {
        button: 0,
        clientY: 200,
        pointerId: 1,
      })
      fireEvent.pointerMove(header, { clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(header, { clientY: 100, pointerId: 2 })

      expect(onSnapChange).not.toHaveBeenCalled()
    })

    it("ignores pointer move before pointer down", () => {
      renderDrawer({ snap: "half" })

      const header = screen.getByTestId("drawer-header")
      const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)
      fireEvent.pointerMove(header, { clientY: 100, pointerId: 1 })

      expect(screen.getByTestId("drawer")).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
      })
    })
  })

  describe("nested content drag", () => {
    function getDrawerContent() {
      const content = screen.getByText("Drawer body").closest(".overflow-y-auto")

      if (!(content instanceof HTMLElement)) {
        throw new Error("Expected drawer scroll content")
      }

      return content
    }

    it("expands from half when dragging up on scrolled list content", async () => {
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange, controlled: true })

      const content = getDrawerContent()
      Object.defineProperty(content, "scrollTop", {
        configurable: true,
        get: () => 40,
      })
      mockPointerCapture(content)

      fireEvent.pointerDown(content, {
        button: 0,
        clientY: 200,
        pointerId: 1,
      })
      fireEvent.pointerMove(content, { clientY: 0, pointerId: 1 })
      fireEvent.pointerUp(content, { clientY: 0, pointerId: 1 })

      expect(onSnapChange).toHaveBeenCalledWith("full")
    })

    it("does not collapse when pulling down on scrolled list content", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange })

      const content = getDrawerContent()
      Object.defineProperty(content, "scrollTop", {
        configurable: true,
        get: () => 120,
      })
      mockPointerCapture(content)

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: content,
          coords: { clientX: 0, clientY: 200 },
        },
        { coords: { clientX: 0, clientY: 340 } },
        { keys: "[/MouseLeft]" },
      ])

      expect(onSnapChange).not.toHaveBeenCalled()
    })

    it("collapses from full when pulling down at scroll top", async () => {
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange, controlled: true })

      const content = getDrawerContent()
      Object.defineProperty(content, "scrollTop", {
        configurable: true,
        get: () => 0,
      })
      mockPointerCapture(content)

      fireEvent.pointerDown(content, {
        button: 0,
        clientY: 200,
        pointerId: 1,
      })
      fireEvent.pointerMove(content, { clientY: 420, pointerId: 1 })
      fireEvent.pointerUp(content, { clientY: 420, pointerId: 1 })

      expect(onSnapChange).toHaveBeenCalledWith("half")
    })
  })

  describe("preventDraggableBottomDrawerPropagation", () => {
    it("stops pointer event propagation", () => {
      const stopPropagation = vi.fn()
      const event = {
        stopPropagation,
      } as unknown as React.PointerEvent<HTMLElement>

      preventDraggableBottomDrawerPropagation(event)

      expect(stopPropagation).toHaveBeenCalledOnce()
    })
  })
})
