import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LISTING_CONTRACT_OPTIONS } from "../utils/listingContract"
import { EditContract } from "./EditContract"

describe("EditContract", () => {
  it("preselects the current contract length and submits only a change", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EditContract currentContractMonths={3} onSubmit={onSubmit} />)

    expect(screen.getByRole("radio", { name: /3 months/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

    await user.click(screen.getByRole("radio", { name: /6 months/i }))
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(6)
  })

  it("accepts a string current value", () => {
    render(<EditContract currentContractMonths="12" onSubmit={vi.fn()} />)

    expect(screen.getByRole("radio", { name: /12 months/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("falls back to the default contract when the value is missing or invalid", () => {
    const { rerender } = render(<EditContract onSubmit={vi.fn()} />)

    expect(screen.getByRole("radio", { name: /3 months/i })).toBeChecked()

    rerender(<EditContract currentContractMonths={null} onSubmit={vi.fn()} />)
    expect(screen.getByRole("radio", { name: /3 months/i })).toBeChecked()

    rerender(<EditContract currentContractMonths="nope" onSubmit={vi.fn()} />)
    expect(screen.getByRole("radio", { name: /3 months/i })).toBeChecked()

    rerender(<EditContract currentContractMonths={9} onSubmit={vi.fn()} />)
    expect(screen.getByRole("radio", { name: /3 months/i })).toBeChecked()
  })

  it("renders every contract option with its description", () => {
    render(<EditContract currentContractMonths={1} onSubmit={vi.fn()} />)

    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(LISTING_CONTRACT_OPTIONS.length)

    for (const option of LISTING_CONTRACT_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument()
      expect(screen.getByText(option.description)).toBeInTheDocument()
      expect(
        screen.getByRole("radio", {
          name: (_, element) =>
            element.getAttribute("value") === String(option.value),
        }),
      ).toBeInTheDocument()
    }
  })

  it("keeps Save disabled when the selection returns to the current value", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EditContract currentContractMonths={3} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("radio", { name: /6 months/i }))
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()

    await user.click(screen.getByRole("radio", { name: /3 months/i }))
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("locks the form while saving and displays a normalized error", () => {
    render(
      <EditContract
        currentContractMonths={6}
        errorMessage="  Could not update contract. Try again.  "
        isSubmitting
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: /6 months/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update contract. Try again.",
    )
  })

  it("hides the alert for blank error messages", () => {
    const { rerender } = render(
      <EditContract
        currentContractMonths={3}
        errorMessage="   "
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    rerender(
      <EditContract
        currentContractMonths={3}
        errorMessage={null}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("stops nested form submit propagation", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onOuterSubmit = vi.fn((event: Event) => {
      event.preventDefault()
    })

    render(
      <form onSubmit={onOuterSubmit}>
        <EditContract currentContractMonths={3} onSubmit={onSubmit} />
      </form>,
    )

    await user.click(screen.getByRole("radio", { name: /1 month/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith(1)
    expect(onOuterSubmit).not.toHaveBeenCalled()
  })

  it("merges a caller className onto the form", () => {
    const { container } = render(
      <EditContract
        className="contract-editor"
        currentContractMonths={3}
        onSubmit={vi.fn()}
      />,
    )

    expect(container.querySelector("form")).toHaveClass("contract-editor")
  })

  it("supports an async onSubmit handler", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)

    render(<EditContract currentContractMonths={2} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("radio", { name: /12 months/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith(12)
  })
})
