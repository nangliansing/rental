import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ReasonNoteDialog } from "./ReasonNoteDialog"

const defaultProps = {
  isOpen: true,
  title: "Review report",
  description: "Choose a reason and leave a note.",
  note: "",
  confirmLabel: "Submit review",
  onNoteChange: vi.fn(),
  onCancel: vi.fn(),
  onSubmit: vi.fn(),
}

describe("ReasonNoteDialog", () => {
  it("renders nothing while closed", () => {
    render(<ReasonNoteDialog {...defaultProps} isOpen={false} />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders safely without optional reasons, messages, or summary", () => {
    render(
      <ReasonNoteDialog
        {...defaultProps}
        reasonOptions={undefined}
        error={undefined}
        successMessage={undefined}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Review report" }),
    ).toHaveAccessibleDescription("Choose a reason and leave a note.")
    expect(screen.getByRole("textbox", { name: "Details" })).toHaveValue("")
    expect(screen.queryByText("Reason")).not.toBeInTheDocument()
  })

  it("reports reason selection and note changes", () => {
    const onReasonChange = vi.fn()
    const onNoteChange = vi.fn()

    render(
      <ReasonNoteDialog
        {...defaultProps}
        reasonOptions={[
          { label: "Wrong price", value: "WRONG_PRICE" },
          { label: "Unavailable", value: "UNAVAILABLE" },
        ]}
        onReasonChange={onReasonChange}
        onNoteChange={onNoteChange}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Wrong price" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Details" }), {
      target: { value: "Checked with the owner." },
    })

    expect(onReasonChange).toHaveBeenCalledWith("WRONG_PRICE")
    expect(onNoteChange).toHaveBeenCalledWith("Checked with the owner.")
  })

  it("supports optional content and hides the note field when requested", () => {
    render(
      <ReasonNoteDialog
        {...defaultProps}
        itemSummary={<p>Listing #123</p>}
        showNoteField={false}
        error="Could not submit."
        successMessage="Saved successfully."
        showCloseButton
      />,
    )

    expect(screen.getByText("Listing #123")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.getByText("Could not submit.")).toBeInTheDocument()
    expect(screen.getByText("Saved successfully.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeEnabled()
  })

  it("calls submit and every supported cancellation path", () => {
    const onCancel = vi.fn()
    const onSubmit = vi.fn()

    render(
      <ReasonNoteDialog
        {...defaultProps}
        showCloseButton
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Submit review" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }))
    fireEvent.keyDown(document, { key: "Escape" })
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')

    expect(overlay).not.toBeNull()
    fireEvent.mouseDown(overlay!)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledTimes(4)
  })

  it("locks fields and dismissal while submitting", () => {
    const onCancel = vi.fn()

    render(
      <ReasonNoteDialog
        {...defaultProps}
        isSubmitting
        showCloseButton
        reasonOptions={[{ label: "Wrong price", value: "WRONG_PRICE" }]}
        onCancel={onCancel}
      />,
    )

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')

    expect(screen.getByRole("button", { name: "Wrong price" })).toBeDisabled()
    expect(screen.getByRole("textbox", { name: "Details" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Submit review" })).toBeDisabled()

    fireEvent.keyDown(document, { key: "Escape" })
    fireEvent.mouseDown(overlay!)

    expect(onCancel).not.toHaveBeenCalled()
  })
})
