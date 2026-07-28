import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LISTING_PRIVACY_OPTIONS } from "../utils/listingPrivacy"
import { EditPrivacy } from "./EditPrivacy"

describe("EditPrivacy", () => {
  it("preselects the current visibility and submits only a change", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EditPrivacy currentVisibility="PUBLIC" onSubmit={onSubmit} />)

    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

    await user.click(screen.getByRole("radio", { name: /private/i }))
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith("PRIVATE")
  })

  it("falls back to public when the value is missing or invalid", () => {
    const { rerender } = render(<EditPrivacy onSubmit={vi.fn()} />)

    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument()

    rerender(<EditPrivacy currentVisibility={null} onSubmit={vi.fn()} />)
    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()

    rerender(
      <EditPrivacy
        currentVisibility={"HIDDEN" as never}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
  })

  it("renders every privacy option with its description and icon", () => {
    const { container } = render(
      <EditPrivacy currentVisibility="PRIVATE" onSubmit={vi.fn()} />,
    )

    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(LISTING_PRIVACY_OPTIONS.length)
    expect(
      container.querySelectorAll("svg[aria-hidden='true']").length,
    ).toBeGreaterThanOrEqual(LISTING_PRIVACY_OPTIONS.length)

    for (const option of LISTING_PRIVACY_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument()
      expect(screen.getByText(option.description)).toBeInTheDocument()
      expect(
        screen.getByRole("radio", {
          name: (_, element) => element.getAttribute("value") === option.value,
        }),
      ).toBeInTheDocument()
    }
  })

  it("keeps Save disabled when the selection returns to the current value", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EditPrivacy currentVisibility="PUBLIC" onSubmit={onSubmit} />)

    await user.click(screen.getByRole("radio", { name: /private/i }))
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()

    await user.click(screen.getByRole("radio", { name: /public/i }))
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("locks the form while saving and displays a normalized error", () => {
    render(
      <EditPrivacy
        currentVisibility="PRIVATE"
        errorMessage="  Could not update listing privacy. Try again.  "
        isSubmitting
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: /private/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update listing privacy. Try again.",
    )
  })

  it("hides the alert for blank error messages", () => {
    const { rerender } = render(
      <EditPrivacy
        currentVisibility="PUBLIC"
        errorMessage="   "
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    rerender(
      <EditPrivacy
        currentVisibility="PUBLIC"
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
        <EditPrivacy currentVisibility="PUBLIC" onSubmit={onSubmit} />
      </form>,
    )

    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith("PRIVATE")
    expect(onOuterSubmit).not.toHaveBeenCalled()
  })

  it("merges a caller className onto the form", () => {
    const { container } = render(
      <EditPrivacy
        className="privacy-editor"
        currentVisibility="PUBLIC"
        onSubmit={vi.fn()}
      />,
    )

    expect(container.querySelector("form")).toHaveClass("privacy-editor")
  })

  it("supports an async onSubmit handler", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)

    render(<EditPrivacy currentVisibility="PRIVATE" onSubmit={onSubmit} />)

    await user.click(screen.getByRole("radio", { name: /public/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith("PUBLIC")
  })
})
