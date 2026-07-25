import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { useAccessibleModal } from "./useAccessibleModal"

function TestModal({
  onClose,
  children,
}: {
  onClose: () => void
  children?: ReactNode
}) {
  const { containerRef, onBackdropClick } = useAccessibleModal({
    isOpen: true,
    onClose,
  })

  return (
    <div data-testid="backdrop" onClick={onBackdropClick}>
      <div ref={containerRef} role="dialog" aria-modal="true">
        <button type="button" autoFocus>First</button>
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
            <TestModal
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

  it("only closes from a direct backdrop click", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TestModal onClose={onClose} />)

    await user.click(screen.getByRole("dialog"))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByTestId("backdrop"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("keeps nested scroll locks and closes only the topmost modal", async () => {
    const user = userEvent.setup()

    function NestedHarness() {
      const [outerOpen, setOuterOpen] = useState(true)
      const [innerOpen, setInnerOpen] = useState(true)

      return (
        <>
          {outerOpen && <TestModal onClose={() => setOuterOpen(false)} />}
          {innerOpen && <TestModal onClose={() => setInnerOpen(false)} />}
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
