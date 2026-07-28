import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListingContractField } from "./ListingContractField"

describe("ListingContractField", () => {
  it("shows the current contract as a tab trigger", () => {
    const { rerender } = render(
      <ListingContractField value={3} onChange={vi.fn()} />,
    )

    expect(screen.getByRole("button", { name: "3 months" })).toBeInTheDocument()

    rerender(<ListingContractField value={12} onChange={vi.fn()} />)
    expect(
      screen.getByRole("button", { name: "12 months" }),
    ).toBeInTheDocument()
  })

  it("accepts a string value and falls back for invalid values", () => {
    const { rerender } = render(
      <ListingContractField value="6" onChange={vi.fn()} />,
    )

    expect(screen.getByRole("button", { name: "6 months" })).toBeInTheDocument()

    rerender(<ListingContractField value="nope" onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "3 months" })).toBeInTheDocument()
  })

  it("opens the contract modal and commits a change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingContractField
        value={3}
        aria-label="Minimum contract"
        onChange={onChange}
      />,
    )

    const trigger = screen.getByRole("button", { name: "Minimum contract" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByRole("dialog", { name: "Minimum contract" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /3 months/i })).toBeChecked()

    await user.click(screen.getByRole("radio", { name: /6 months/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(6)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("does not call onChange when the dialog is dismissed without saving", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingContractField
        value={3}
        aria-label="Minimum contract"
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Minimum contract" }))
    await user.click(screen.getByRole("radio", { name: /12 months/i }))
    await user.click(screen.getAllByRole("button", { name: "Close" })[0]!)

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()

    render(<ListingContractField value={3} onChange={vi.fn()} disabled />)

    const trigger = screen.getByRole("button", { name: "3 months" })
    expect(trigger).toBeDisabled()

    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open when readOnly", async () => {
    const user = userEvent.setup()

    render(<ListingContractField value={3} onChange={vi.fn()} readOnly />)

    const trigger = screen.getByRole("button", { name: "3 months" })
    expect(trigger).toHaveAttribute("aria-readonly", "true")

    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open while loading and locks the dialog submit state", async () => {
    const user = userEvent.setup()

    render(<ListingContractField value={3} onChange={vi.fn()} isLoading />)

    const trigger = screen.getByRole("button", { name: "3 months" })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute("aria-busy", "true")

    await user.click(trigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("forwards required, error, describedby, invalid, and id", () => {
    render(
      <>
        <span id="contract-hint">Contract hint</span>
        <ListingContractField
          id="listing-contract"
          value={3}
          required
          error="Choose a contract length"
          aria-describedby="contract-hint"
          aria-invalid="true"
          onChange={vi.fn()}
        />
      </>,
    )

    const trigger = screen.getByRole("button", { name: "3 months" })
    expect(trigger).toHaveAttribute("id", "listing-contract")
    expect(trigger).toHaveAttribute("aria-required", "true")
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger.getAttribute("aria-describedby")).toContain("contract-hint")
    expect(trigger.getAttribute("aria-describedby")).toContain(
      "listing-contract-error",
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a contract length",
    )
  })

  it("renders the contract icon and merges className", () => {
    const { container } = render(
      <ListingContractField
        value={1}
        className="contract-field"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "1 month" })).toBeInTheDocument()
    expect(
      container.querySelector("svg[aria-hidden='true']"),
    ).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass(
      "inline-flex",
      "shrink-0",
      "contract-field",
    )
  })
})
