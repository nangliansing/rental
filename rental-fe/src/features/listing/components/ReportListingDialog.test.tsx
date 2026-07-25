import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ReportListingDialog } from "./ReportListingDialog"

describe("ReportListingDialog", () => {
  it("renders nothing while closed", () => {
    render(
      <ReportListingDialog
        isOpen={false}
        isSubmitting={false}
        selectedReason={null}
        note=""
        onReasonChange={vi.fn()}
        onNoteChange={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("requires a reason and forwards controlled user input", async () => {
    const user = userEvent.setup()
    const onReasonChange = vi.fn()
    const onNoteChange = vi.fn()
    const onSubmit = vi.fn()
    const { rerender } = render(
      <ReportListingDialog
        isOpen
        isSubmitting={false}
        selectedReason={null}
        note=""
        onReasonChange={onReasonChange}
        onNoteChange={onNoteChange}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("button", { name: "Submit report" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Wrong price" }))
    expect(onReasonChange).toHaveBeenCalledWith("WRONG_PRICE")

    rerender(
      <ReportListingDialog
        isOpen
        isSubmitting={false}
        selectedReason="WRONG_PRICE"
        note=""
        onReasonChange={onReasonChange}
        onNoteChange={onNoteChange}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const note = screen.getByRole("textbox", { name: "Details" })
    expect(note).toHaveAttribute("maxlength", "1000")
    await user.type(note, "Incorrect advertised price")
    expect(onNoteChange).toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Submit report" }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
