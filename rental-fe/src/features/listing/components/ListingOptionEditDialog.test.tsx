import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListingOptionEditDialog } from "./ListingOptionEditDialog"

describe("ListingOptionEditDialog", () => {
  it("renders nothing while closed", () => {
    render(
      <ListingOptionEditDialog
        isOpen={false}
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={vi.fn()}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Form body")).not.toBeInTheDocument()
  })

  it("renders title, description, and children when open", () => {
    render(
      <ListingOptionEditDialog
        isOpen
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={vi.fn()}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    expect(
      screen.getByRole("dialog", { name: "Minimum contract" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Minimum contract")).toBeInTheDocument()
    expect(
      screen.getByText("Choose how long tenants must stay."),
    ).toBeInTheDocument()
    expect(screen.getByText("Form body")).toBeInTheDocument()
  })

  it("uses a custom ariaLabel when provided", () => {
    render(
      <ListingOptionEditDialog
        isOpen
        title="Listing privacy"
        description="Choose who can find and view this listing."
        ariaLabel="Edit listing privacy"
        onClose={vi.fn()}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    expect(
      screen.getByRole("dialog", { name: "Edit listing privacy" }),
    ).toBeInTheDocument()
  })

  it("closes from the back dismiss control", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ListingOptionEditDialog
        isOpen
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={onClose}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    await user.click(screen.getAllByRole("button", { name: "Close" })[0]!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("closes from the trailing dismiss control", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ListingOptionEditDialog
        isOpen
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={onClose}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    await user.click(screen.getAllByRole("button", { name: "Close" })[1]!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not close from header dismiss controls while submitting", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ListingOptionEditDialog
        isOpen
        isSubmitting
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={onClose}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    for (const button of screen.getAllByRole("button", { name: "Close" })) {
      await user.click(button)
    }

    expect(onClose).not.toHaveBeenCalled()
    expect(
      screen.getByRole("dialog", { name: "Minimum contract" }),
    ).toBeInTheDocument()
  })

  it("does not dismiss via Escape while submitting", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ListingOptionEditDialog
        isOpen
        isSubmitting
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={onClose}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    await user.keyboard("{Escape}")
    expect(onClose).not.toHaveBeenCalled()
  })

  it("dismisses via Escape when not submitting", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ListingOptionEditDialog
        isOpen
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={onClose}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    await user.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("uses the compact desktop panel sizing for option editors", () => {
    render(
      <ListingOptionEditDialog
        isOpen
        title="Minimum contract"
        description="Choose how long tenants must stay."
        onClose={vi.fn()}
      >
        <p>Form body</p>
      </ListingOptionEditDialog>,
    )

    const panel = screen
      .getByRole("dialog", { name: "Minimum contract" })
      .querySelector("section")

    expect(panel).toHaveClass("md:max-w-md")
  })
})
