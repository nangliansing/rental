import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRef, useState, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { useAccessibleModal } from "./useAccessibleModal"

function TrackedModal({
  isOpen,
  onClose,
  children,
  skipHistorySyncRef,
}: {
  isOpen: boolean
  onClose: () => void
  children?: ReactNode
  skipHistorySyncRef?: React.RefObject<boolean>
}) {
  const { containerRef, onBackdropClick } = useAccessibleModal({
    isOpen,
    onClose,
    skipHistorySyncRef,
  })

  if (!isOpen) return null

  return (
    <div data-testid="backdrop" onClick={onBackdropClick}>
      <div ref={containerRef} role="dialog" aria-modal="true">
        <button type="button" autoFocus>
          First
        </button>
        <button type="button">Last</button>
        {children}
      </div>
    </div>
  )
}

describe("useAccessibleModal", () => {
  it("locks scroll, traps focus, closes from Escape, and restores focus", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open</button>
          {open && (
            <TrackedModal
              isOpen
              onClose={() => {
                onClose()
                setOpen(false)
              }}
            />
          )}
        </>
      )
    }

    render(<Harness />)
    const opener = screen.getByRole("button", { name: "Open" })
    await user.click(opener)

    await waitFor(() => expect(screen.getByRole("button", { name: "First" })).toHaveFocus())
    expect(document.body.style.overflow).toBe("hidden")

    screen.getByRole("button", { name: "Last" }).focus()
    await user.tab()
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus()

    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalledOnce()
    expect(document.body.style.overflow).toBe("")
    expect(opener).toHaveFocus()
  })

  it("closes from browser back when history tracking is enabled", async () => {
    const onClose = vi.fn()
    const pushState = vi.spyOn(window.history, "pushState")

    function Harness() {
      const [open, setOpen] = useState(true)
      return open ? (
        <TrackedModal
          isOpen
          onClose={() => {
            onClose()
            setOpen(false)
          }}
        />
      ) : null
    }

    render(<Harness />)
    expect(pushState).toHaveBeenCalled()

    window.dispatchEvent(new PopStateEvent("popstate"))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("only closes from a direct backdrop click", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TrackedModal onClose={onClose} isOpen />)

    await user.click(screen.getByRole("dialog"))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByTestId("backdrop"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("skips history sync on unmount when skipHistorySyncRef is set", async () => {
    const back = vi.spyOn(window.history, "back")

    function HandoffHarness() {
      const skipHistorySyncRef = useRef(false)
      const [previewOpen, setPreviewOpen] = useState(true)
      const [detailOpen, setDetailOpen] = useState(false)

      return (
        <>
          {previewOpen && (
            <TrackedModal
              isOpen
              skipHistorySyncRef={skipHistorySyncRef}
              onClose={() => setPreviewOpen(false)}
            />
          )}
          {detailOpen && (
            <TrackedModal isOpen onClose={() => setDetailOpen(false)} />
          )}
          <button
            type="button"
            onClick={() => {
              skipHistorySyncRef.current = true
              setPreviewOpen(false)
              setDetailOpen(true)
            }}
          >
            Hand off
          </button>
        </>
      )
    }

    render(<HandoffHarness />)
    back.mockClear()

    await userEvent.setup().click(screen.getByRole("button", { name: "Hand off" }))

    expect(back).not.toHaveBeenCalled()
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
  })

  it("keeps nested scroll locks and closes only the topmost modal", async () => {
    const user = userEvent.setup()

    function NestedHarness() {
      const [outerOpen, setOuterOpen] = useState(true)
      const [innerOpen, setInnerOpen] = useState(true)

      return (
        <>
          {outerOpen && <TrackedModal isOpen onClose={() => setOuterOpen(false)} />}
          {innerOpen && <TrackedModal isOpen onClose={() => setInnerOpen(false)} />}
        </>
      )
    }

    render(<NestedHarness />)
    expect(screen.getAllByRole("dialog")).toHaveLength(2)
    expect(document.body.style.overflow).toBe("hidden")

    await user.keyboard("{Escape}")
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(document.body.style.overflow).toBe("hidden")

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe("")
  })
})
