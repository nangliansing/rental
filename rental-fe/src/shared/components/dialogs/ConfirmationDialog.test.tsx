import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { ConfirmationDialog } from "./ConfirmationDialog"

const defaultProps = {
  isOpen: true,
  title: "Delete listing?",
  description: "This listing will no longer be visible.",
  confirmLabel: "Delete",
  onClose: vi.fn(),
  onConfirm: vi.fn(),
}

describe("ConfirmationDialog", () => {
  it("renders nothing while closed", () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders an accessible dialog with defensive optional defaults", () => {
    render(<ConfirmationDialog {...defaultProps} error={undefined} />)

    expect(
      screen.getByRole("dialog", { name: "Delete listing?" }),
    ).toHaveAccessibleDescription("This listing will no longer be visible.")
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled()
    expect(screen.queryByText("undefined")).not.toBeInTheDocument()
  })

  it("calls the confirm and cancel actions", () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ConfirmationDialog
        {...defaultProps}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("closes from Escape, the close button, and the backdrop", () => {
    const onClose = vi.fn()

    render(<ConfirmationDialog {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: "Escape" })
    fireEvent.click(screen.getByRole("button", { name: "Close confirmation" }))
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')

    expect(overlay).not.toBeNull()
    fireEvent.mouseDown(overlay!)

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it("locks every action while submitting", () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ConfirmationDialog
        {...defaultProps}
        isSubmitting
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Close confirmation" }),
    ).toBeDisabled()

    fireEvent.keyDown(document, { key: "Escape" })
    fireEvent.mouseDown(overlay!)

    expect(onClose).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("renders optional error and icon content", () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        icon={<span aria-label="Warning">!</span>}
        error="The listing could not be deleted."
      />,
    )

    expect(screen.getByLabelText("Warning")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The listing could not be deleted.",
    )
  })

  it("moves focus into the dialog and restores it after closing", async () => {
    const user = userEvent.setup()

    function DialogHarness() {
      const [isOpen, setIsOpen] = useState(false)

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open dialog
          </button>
          <ConfirmationDialog
            {...defaultProps}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </>
      )
    }

    render(<DialogHarness />)

    const trigger = screen.getByRole("button", { name: "Open dialog" })
    await user.click(trigger)

    expect(screen.getByRole("button", { name: "Close confirmation" })).toHaveFocus()

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(trigger).toHaveFocus()
  })
})
