import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef, type RefObject } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  DraggableBottomDrawer,
  DraggableBottomDrawerDragRegion,
  preventDraggableBottomDrawerPropagation,
  type DraggableBottomDrawerSnap,
} from "./DraggableBottomDrawer"
import { DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS } from "./draggable-bottom-drawer.utils"

function mockPointerCapture(element: HTMLElement) {
  element.setPointerCapture = vi.fn()
  element.releasePointerCapture = vi.fn()
  element.hasPointerCapture = vi.fn(() => true)
}

function renderDrawer({
  snap = "half" as DraggableBottomDrawerSnap,
  onSnapChange = vi.fn(),
  hideContentWhenPeek,
  ariaLabel,
  contentRef,
  useDragRegion = false,
}: {
  snap?: DraggableBottomDrawerSnap
  onSnapChange?: (snap: DraggableBottomDrawerSnap) => void
  hideContentWhenPeek?: boolean
  ariaLabel?: string
  contentRef?: RefObject<HTMLDivElement | null>
  useDragRegion?: boolean
} = {}) {
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
  describe("rendering", () => {
    it.each(["peek", "half", "full"] as const)(
      "applies the %s snap height class",
      (snap) => {
        renderDrawer({ snap })

        expect(screen.getByTestId("drawer")).toHaveClass(
          DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS[snap],
        )
      },
    )

    it("hides children at peek by default", () => {
      renderDrawer({ snap: "peek" })

      expect(screen.queryByText("Drawer body")).not.toBeInTheDocument()
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

  describe("drag gestures from half", () => {
    it("advances to full after a strong upward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 200, 120)

      expect(onSnapChange).toHaveBeenCalledOnce()
      expect(onSnapChange).toHaveBeenCalledWith("full")
    })

    it("advances to peek after a strong downward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 120, 200)

      expect(onSnapChange).toHaveBeenCalledOnce()
      expect(onSnapChange).toHaveBeenCalledWith("peek")
    })

    it("ignores small drags below the snap threshold", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 150, 130)

      expect(onSnapChange).not.toHaveBeenCalled()
    })
  })

  describe("drag gestures from peek", () => {
    it("advances to half after a strong upward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "peek", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 200, 120)

      expect(onSnapChange).toHaveBeenCalledWith("half")
    })

    it("stays at peek after a strong downward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "peek", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 120, 220)

      expect(onSnapChange).not.toHaveBeenCalled()
    })
  })

  describe("drag gestures from full", () => {
    it("advances to half after a strong downward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 120, 200)

      expect(onSnapChange).toHaveBeenCalledWith("half")
    })

    it("stays at full after a strong upward drag", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "full", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 200, 120)

      expect(onSnapChange).not.toHaveBeenCalled()
    })
  })

  describe("pointer lifecycle", () => {
    it("applies translateY while dragging and resets on release", async () => {
      const user = userEvent.setup()
      renderDrawer({ snap: "half" })

      const header = screen.getByTestId("drawer-header")
      const drawer = screen.getByTestId("drawer")
      mockPointerCapture(header)

      expect(drawer).toHaveStyle({ transform: "translateY(0px)" })

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: header,
          coords: { clientX: 0, clientY: 150 },
        },
        { coords: { clientX: 0, clientY: 130 } },
      ])

      expect(drawer).toHaveStyle({ transform: "translateY(-20px)" })
      expect(drawer.className).not.toContain("transition-[height,transform]")

      await user.pointer([{ keys: "[/MouseLeft]" }])

      expect(drawer).toHaveStyle({ transform: "translateY(0px)" })
      expect(drawer.className).toContain("transition-[height,transform]")
    })

    it("resolves snap on pointer cancel when drag exceeds threshold", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      const header = screen.getByTestId("drawer-header")
      mockPointerCapture(header)

      await user.pointer([
        {
          keys: "[MouseLeft>]",
          target: header,
          coords: { clientX: 0, clientY: 200 },
        },
        { coords: { clientX: 0, clientY: 120 } },
      ])

      fireEvent.pointerCancel(header, { pointerId: 1 })

      expect(onSnapChange).toHaveBeenCalledWith("full")
      expect(screen.getByTestId("drawer")).toHaveStyle({
        transform: "translateY(0px)",
      })
    })

    it("does not change snap on pointer cancel below threshold", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      const header = screen.getByTestId("drawer-header")
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
        transform: "translateY(0px)",
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
      fireEvent.pointerMove(header, { clientY: 100, pointerId: 1 })

      expect(screen.getByTestId("drawer")).toHaveStyle({
        transform: "translateY(0px)",
      })
    })

    it("does not call onSnapChange when snap would remain unchanged", async () => {
      const user = userEvent.setup()
      const onSnapChange = vi.fn()
      renderDrawer({ snap: "half", onSnapChange })

      await dragHeader(user, screen.getByTestId("drawer-header"), 150, 140)

      expect(onSnapChange).not.toHaveBeenCalled()
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
