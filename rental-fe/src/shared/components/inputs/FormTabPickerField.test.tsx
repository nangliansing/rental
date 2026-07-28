import { FileText } from "lucide-react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FormTabPickerField } from "./FormTabPickerField"

function PickerProbe({
  isOpen,
  isSubmitting,
  onClose,
}: {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
}) {
  return (
    <div>
      <p data-testid="picker-open">{isOpen ? "open" : "closed"}</p>
      <p data-testid="picker-submitting">
        {isSubmitting ? "submitting" : "idle"}
      </p>
      {isOpen ? (
        <button type="button" onClick={onClose}>
          Close picker
        </button>
      ) : null}
    </div>
  )
}

describe("FormTabPickerField", () => {
  it("renders the tab trigger with the provided label", () => {
    render(
      <FormTabPickerField label="3 months">
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    expect(screen.getByRole("button", { name: "3 months" })).toBeInTheDocument()
    expect(screen.getByTestId("picker-open")).toHaveTextContent("closed")
    expect(screen.getByTestId("picker-submitting")).toHaveTextContent("idle")
  })

  it("opens on click and exposes onClose to children", async () => {
    const user = userEvent.setup()

    render(
      <FormTabPickerField label="Public" aria-label="Visibility">
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    const trigger = screen.getByRole("button", { name: "Visibility" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")

    await user.click(trigger)

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByTestId("picker-open")).toHaveTextContent("open")

    await user.click(screen.getByRole("button", { name: "Close picker" }))

    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByTestId("picker-open")).toHaveTextContent("closed")
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()

    render(
      <FormTabPickerField label="Public" disabled>
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toBeDisabled()

    await user.click(trigger)
    expect(screen.getByTestId("picker-open")).toHaveTextContent("closed")
  })

  it("does not open when readOnly", async () => {
    const user = userEvent.setup()

    render(
      <FormTabPickerField label="Public" readOnly>
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toHaveAttribute("aria-readonly", "true")

    await user.click(trigger)
    expect(screen.getByTestId("picker-open")).toHaveTextContent("closed")
  })

  it("does not open while loading and passes isSubmitting to children", async () => {
    const user = userEvent.setup()

    render(
      <FormTabPickerField label="Public" isLoading>
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute("aria-busy", "true")
    expect(screen.getByTestId("picker-submitting")).toHaveTextContent(
      "submitting",
    )

    await user.click(trigger)
    expect(screen.getByTestId("picker-open")).toHaveTextContent("closed")
  })

  it("uses a provided id on the trigger", () => {
    render(
      <FormTabPickerField id="listing-contract" label="3 months">
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    expect(screen.getByRole("button", { name: "3 months" })).toHaveAttribute(
      "id",
      "listing-contract",
    )
  })

  it("falls back to a generated id when id is blank", () => {
    render(
      <FormTabPickerField id="   " label="Public">
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toHaveAttribute("id")
    expect(trigger.getAttribute("id")).not.toBe("   ")
    expect(trigger.getAttribute("id")?.trim()).not.toBe("")
  })

  it("forwards required, describedby, invalid, and error state", () => {
    render(
      <>
        <span id="hint">Extra hint</span>
        <FormTabPickerField
          id="visibility"
          label="Public"
          required
          error="Visibility is required"
          aria-describedby="hint"
          aria-invalid="true"
        >
          {(controls) => <PickerProbe {...controls} />}
        </FormTabPickerField>
      </>,
    )

    const trigger = screen.getByRole("button", { name: "Public" })
    expect(trigger).toHaveAttribute("aria-required", "true")
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger.getAttribute("aria-describedby")).toContain("hint")
    expect(trigger.getAttribute("aria-describedby")).toContain(
      "visibility-error",
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Visibility is required",
    )
  })

  it("renders an icon when provided", () => {
    const { container } = render(
      <FormTabPickerField label="3 months" icon={FileText}>
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    expect(
      container.querySelector("svg[aria-hidden='true']"),
    ).toBeInTheDocument()
  })

  it("merges a caller className onto the wrapper", () => {
    const { container } = render(
      <FormTabPickerField label="Public" className="picker-field">
        {(controls) => <PickerProbe {...controls} />}
      </FormTabPickerField>,
    )

    expect(container.firstElementChild).toHaveClass(
      "inline-flex",
      "shrink-0",
      "picker-field",
    )
  })

  it("keeps children mounted while closed so dialogs can remount on open", () => {
    const children = vi.fn((controls: {
      isOpen: boolean
      isSubmitting: boolean
      onClose: () => void
    }) => <PickerProbe {...controls} />)

    render(
      <FormTabPickerField label="Public">{children}</FormTabPickerField>,
    )

    expect(children).toHaveBeenCalled()
    expect(children.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        isOpen: false,
        isSubmitting: false,
        onClose: expect.any(Function),
      }),
    )
  })
})
