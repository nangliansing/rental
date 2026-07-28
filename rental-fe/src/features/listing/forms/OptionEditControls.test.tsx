import { Globe } from "lucide-react"
import type { ComponentProps, FormEvent } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OptionEditFormShell, OptionRadioCard } from "./OptionEditControls"

describe("OptionRadioCard", () => {
  const baseProps = {
    id: "option-public",
    name: "privacy",
    value: "PUBLIC",
    label: "Public",
    description: "Anyone can find this listing.",
    descriptionId: "option-public-description",
    onSelect: vi.fn(),
  }

  it("exposes an accessible radio with label and description", () => {
    render(<OptionRadioCard {...baseProps} checked={false} />)

    const radio = screen.getByRole("radio", { name: /public/i })
    expect(radio).toHaveAttribute("id", "option-public")
    expect(radio).toHaveAttribute("name", "privacy")
    expect(radio).toHaveAttribute("value", "PUBLIC")
    expect(radio).toHaveAttribute(
      "aria-describedby",
      "option-public-description",
    )
    expect(radio).not.toBeChecked()
    expect(radio).toBeEnabled()
    expect(screen.getByText("Anyone can find this listing.")).toHaveAttribute(
      "id",
      "option-public-description",
    )
  })

  it("reflects the checked state", () => {
    const { rerender } = render(
      <OptionRadioCard {...baseProps} checked={false} />,
    )

    expect(screen.getByRole("radio", { name: /public/i })).not.toBeChecked()

    rerender(<OptionRadioCard {...baseProps} checked />)
    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
  })

  it("calls onSelect when the option is chosen", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <OptionRadioCard {...baseProps} checked={false} onSelect={onSelect} />,
    )

    await user.click(screen.getByRole("radio", { name: /public/i }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("does not call onSelect when disabled", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <OptionRadioCard
        {...baseProps}
        checked={false}
        disabled
        onSelect={onSelect}
      />,
    )

    const radio = screen.getByRole("radio", { name: /public/i })
    expect(radio).toBeDisabled()

    await user.click(radio)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("supports numeric values without an icon", () => {
    render(
      <OptionRadioCard
        id="option-3"
        name="contract"
        value={3}
        checked
        label="3 months"
        description="Tenants must stay at least 3 months."
        descriptionId="option-3-description"
        onSelect={vi.fn()}
      />,
    )

    const radio = screen.getByRole("radio", { name: /3 months/i })
    expect(radio).toHaveAttribute("value", "3")
    expect(radio).toBeChecked()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("renders a decorative icon when provided", () => {
    const { container } = render(
      <OptionRadioCard {...baseProps} checked icon={Globe} />,
    )

    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
    expect(
      container.querySelector('[aria-hidden="true"] svg'),
    ).toBeInTheDocument()
  })

  it("applies selected visual classes when checked", () => {
    const { container, rerender } = render(
      <OptionRadioCard {...baseProps} checked={false} />,
    )

    const label = container.querySelector("label")
    expect(label).toHaveClass("border-slate-200", "bg-white")
    expect(label).not.toHaveClass("border-slate-950")

    rerender(<OptionRadioCard {...baseProps} checked />)
    expect(container.querySelector("label")).toHaveClass(
      "border-slate-950",
      "bg-slate-50",
    )
  })
})

describe("OptionEditFormShell", () => {
  function renderShell(
    props: Partial<ComponentProps<typeof OptionEditFormShell>> = {},
  ) {
    const onSubmit = props.onSubmit ?? vi.fn()

    render(
      <OptionEditFormShell
        legend="Choose an option"
        hasChanged={false}
        onSubmit={onSubmit}
        {...props}
      >
        <OptionRadioCard
          id="option-a"
          name="group"
          value="A"
          checked
          label="Option A"
          description="First choice"
          descriptionId="option-a-description"
          onSelect={vi.fn()}
        />
      </OptionEditFormShell>,
    )

    return { onSubmit }
  }

  it("renders a screen-reader legend and the option children", () => {
    renderShell()

    expect(screen.getByText("Choose an option")).toHaveClass("sr-only")
    expect(screen.getByRole("radio", { name: /option a/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("keeps Save disabled when nothing has changed", async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderShell({ hasChanged: false })

    const save = screen.getByRole("button", { name: "Save" })
    expect(save).toBeDisabled()

    await user.click(save)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits when there is a change", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
    })

    renderShell({ hasChanged: true, onSubmit })

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("locks the fieldset and Save button while submitting", () => {
    renderShell({ hasChanged: true, isSubmitting: true })

    expect(screen.getByRole("radio", { name: /option a/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })

  it("does not submit while submitting even if hasChanged is true", async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderShell({ hasChanged: true, isSubmitting: true })

    await user.click(screen.getByRole("button", { name: "Saving..." }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows an error alert when errorMessage is provided", () => {
    renderShell({ errorMessage: "Could not save. Try again." })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not save. Try again.",
    )
  })

  it("hides the alert when errorMessage is empty or omitted", () => {
    const { rerender } = render(
      <OptionEditFormShell
        legend="Choose an option"
        hasChanged
        errorMessage=""
        onSubmit={vi.fn()}
      >
        <span>child</span>
      </OptionEditFormShell>,
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    rerender(
      <OptionEditFormShell
        legend="Choose an option"
        hasChanged
        onSubmit={vi.fn()}
      >
        <span>child</span>
      </OptionEditFormShell>,
    )

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("merges a caller className onto the form", () => {
    const { container } = render(
      <OptionEditFormShell
        className="custom-shell"
        legend="Choose an option"
        hasChanged
        onSubmit={vi.fn()}
      >
        <span>child</span>
      </OptionEditFormShell>,
    )

    expect(container.querySelector("form")).toHaveClass(
      "custom-shell",
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
    )
  })
})
