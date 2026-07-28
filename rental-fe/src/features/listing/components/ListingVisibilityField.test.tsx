import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListingVisibilityField } from "./ListingVisibilityField"

describe("ListingVisibilityField", () => {
  it("shows the current visibility as an icon tab trigger", () => {
    const { rerender } = render(
      <ListingVisibilityField value="PUBLIC" onChange={vi.fn()} />,
    )

    expect(screen.getByRole("button", { name: "Public" })).toBeInTheDocument()

    rerender(<ListingVisibilityField value="PRIVATE" onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Private" })).toBeInTheDocument()
  })

  it("opens the privacy modal and commits a change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingVisibilityField
        value="PUBLIC"
        aria-label="Visibility"
        onChange={onChange}
      />,
    )

    const trigger = screen.getByRole("button", { name: "Visibility" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByRole("dialog", { name: "Listing privacy" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()

    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("PRIVATE")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("does not call onChange when the dialog is dismissed without saving", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingVisibilityField
        value="PUBLIC"
        aria-label="Visibility"
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Visibility" }))
    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getAllByRole("button", { name: "Close" })[0]!)

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()

    render(
      <ListingVisibilityField value="PUBLIC" onChange={vi.fn()} disabled />,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toBeDisabled()

    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open when readOnly", async () => {
    const user = userEvent.setup()

    render(
      <ListingVisibilityField value="PUBLIC" onChange={vi.fn()} readOnly />,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toHaveAttribute("aria-readonly", "true")

    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open while loading", async () => {
    const user = userEvent.setup()

    render(
      <ListingVisibilityField value="PUBLIC" onChange={vi.fn()} isLoading />,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute("aria-busy", "true")

    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("forwards required, error, describedby, invalid, and id", () => {
    render(
      <>
        <span id="visibility-hint">Visibility hint</span>
        <ListingVisibilityField
          id="listing-visibility"
          value="PRIVATE"
          required
          error="Choose listing visibility"
          aria-describedby="visibility-hint"
          aria-invalid="true"
          onChange={vi.fn()}
        />
      </>,
    )

    const trigger = screen.getByRole("button", { name: "Private" })
    expect(trigger).toHaveAttribute("id", "listing-visibility")
    expect(trigger).toHaveAttribute("aria-required", "true")
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger.getAttribute("aria-describedby")).toContain(
      "visibility-hint",
    )
    expect(trigger.getAttribute("aria-describedby")).toContain(
      "listing-visibility-error",
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose listing visibility",
    )
  })

  it("renders the privacy icon and merges className", () => {
    const { container } = render(
      <ListingVisibilityField
        value="PUBLIC"
        className="visibility-field"
        onChange={vi.fn()}
      />,
    )

    expect(
      container.querySelector("svg[aria-hidden='true']"),
    ).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass(
      "inline-flex",
      "shrink-0",
      "visibility-field",
    )
  })

  it("keeps a decorative icon for both visibility values", () => {
    const { container, rerender } = render(
      <ListingVisibilityField value="PUBLIC" onChange={vi.fn()} />,
    )

    expect(
      container.querySelector("svg[aria-hidden='true']"),
    ).toBeInTheDocument()

    rerender(<ListingVisibilityField value="PRIVATE" onChange={vi.fn()} />)
    expect(
      container.querySelector("svg[aria-hidden='true']"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Private" })).toBeInTheDocument()
  })
})
