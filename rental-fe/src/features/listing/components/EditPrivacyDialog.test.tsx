import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditPrivacyDialog } from "./EditPrivacyDialog"

describe("EditPrivacyDialog", () => {
  it("does not render while closed", () => {
    render(
      <EditPrivacyDialog
        currentVisibility="PRIVATE"
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("opens with privacy copy and the current selection", () => {
    render(
      <EditPrivacyDialog
        currentVisibility="PRIVATE"
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Listing privacy" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Listing privacy")).toBeInTheDocument()
    expect(
      screen.getByText("Choose who can find and view this listing."),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /private/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("forwards a changed visibility on save", async () => {
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

    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith("PRIVATE")
  })

  it("forwards error and submitting state into the form", () => {
    render(
      <EditPrivacyDialog
        currentVisibility="PUBLIC"
        isOpen
        isSubmitting
        errorMessage="  Could not update listing privacy.  "
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: /public/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update listing privacy.",
    )
  })

  it("closes from the header when idle", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditPrivacyDialog
        currentVisibility="PUBLIC"
        isOpen
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: "Close" })[0]!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not close from the header while submitting", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditPrivacyDialog
        currentVisibility="PUBLIC"
        isOpen
        isSubmitting
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    )

    for (const button of screen.getAllByRole("button", { name: "Close" })) {
      await user.click(button)
    }

    expect(onClose).not.toHaveBeenCalled()
    expect(
      screen.getByRole("dialog", { name: "Listing privacy" }),
    ).toBeInTheDocument()
  })

  it("supports an async onSubmit handler", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)

    render(
      <EditPrivacyDialog
        currentVisibility="PRIVATE"
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("radio", { name: /public/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith("PUBLIC")
  })
})
