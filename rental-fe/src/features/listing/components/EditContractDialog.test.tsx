import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditContractDialog } from "./EditContractDialog"

describe("EditContractDialog", () => {
  it("does not render while closed", () => {
    render(
      <EditContractDialog
        currentContractMonths={3}
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("opens with contract copy and the current selection", () => {
    render(
      <EditContractDialog
        currentContractMonths={6}
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Minimum contract" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Minimum contract")).toBeInTheDocument()
    expect(
      screen.getByText("Choose how long tenants must stay."),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /6 months/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("accepts a string current contract value", () => {
    render(
      <EditContractDialog
        currentContractMonths="12"
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: /12 months/i })).toBeChecked()
  })

  it("forwards a changed contract value on save", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EditContractDialog
        currentContractMonths={3}
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("radio", { name: /1 month/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(1)
  })

  it("forwards error and submitting state into the form", () => {
    render(
      <EditContractDialog
        currentContractMonths={3}
        isOpen
        isSubmitting
        errorMessage="  Could not update contract.  "
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: /3 months/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update contract.",
    )
  })

  it("closes from the header when idle", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditContractDialog
        currentContractMonths={3}
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
      <EditContractDialog
        currentContractMonths={3}
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
      screen.getByRole("dialog", { name: "Minimum contract" }),
    ).toBeInTheDocument()
  })

  it("supports an async onSubmit handler", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)

    render(
      <EditContractDialog
        currentContractMonths={2}
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("radio", { name: /6 months/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith(6)
  })
})
