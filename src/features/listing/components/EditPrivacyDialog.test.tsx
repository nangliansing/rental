import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditPrivacyDialog } from "./EditPrivacyDialog"

describe("EditPrivacyDialog", () => {
  it("opens with the current visibility and forwards a changed value", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EditPrivacyDialog
        currentVisibility="PUBLIC"
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Listing privacy" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()

    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith("PRIVATE")
  })

  it("does not render the form while closed", () => {
    render(
      <EditPrivacyDialog
        currentVisibility="PRIVATE"
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
