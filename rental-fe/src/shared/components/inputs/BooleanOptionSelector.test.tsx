import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, test, vi } from "vitest"

import {
  BooleanOptionSelector,
  type BooleanOptionActiveColor,
  type BooleanOptionSize,
} from "./BooleanOptionSelector"

describe("BooleanOptionSelector", () => {
  it("renders an unselected medium toggle with black defaults", () => {
    render(<BooleanOptionSelector label="Pets allowed" onChange={vi.fn()} />)

    const option = screen.getByRole("button", { name: "Pets allowed" })

    expect(option).toHaveAttribute("type", "button")
    expect(option).toHaveAttribute("aria-pressed", "false")
    expect(option).toHaveClass("min-h-9", "bg-slate-100")
  })

  it("selects and clears the option", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(
      <BooleanOptionSelector label="Pets allowed" onChange={onSelect} />,
    )

    await user.click(screen.getByRole("button", { name: "Pets allowed" }))
    expect(onSelect).toHaveBeenCalledWith(true)

    const onClear = vi.fn()
    rerender(
      <BooleanOptionSelector
        label="Pets allowed"
        value
        onChange={onClear}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Pets allowed" }))
    expect(onClear).toHaveBeenCalledWith(undefined)
  })

  it("disables the option and blocks changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <BooleanOptionSelector
        label="Pets allowed"
        disabled
        onChange={onChange}
      />,
    )

    const option = screen.getByRole("button", { name: "Pets allowed" })
    expect(option).toBeDisabled()

    await user.click(option)
    expect(onChange).not.toHaveBeenCalled()
  })

  test.each([
    ["black", "bg-slate-950"],
    ["blue", "bg-blue-600"],
    ["green", "bg-green-600"],
    ["red", "bg-red-600"],
  ] satisfies [BooleanOptionActiveColor, string][])(
    "supports the %s active color",
    (activeColor, expectedClass) => {
      render(
        <BooleanOptionSelector
          label="Selected"
          value
          activeColor={activeColor}
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: "Selected" })).toHaveClass(
        expectedClass,
      )
    },
  )

  test.each([
    ["small", "min-h-8"],
    ["medium", "min-h-9"],
    ["large", "min-h-10"],
  ] satisfies [BooleanOptionSize, string][])(
    "supports the %s size",
    (size, expectedClass) => {
      render(
        <BooleanOptionSelector
          label="Sized option"
          size={size}
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: "Sized option" })).toHaveClass(
        expectedClass,
      )
    },
  )

  it("merges caller classes over conflicting size classes", () => {
    render(
      <BooleanOptionSelector
        label="Custom option"
        className="min-h-12 px-6"
        onChange={vi.fn()}
      />,
    )

    const option = screen.getByRole("button", { name: "Custom option" })
    expect(option).toHaveClass("min-h-12", "px-6")
    expect(option).not.toHaveClass("min-h-9", "px-3")
  })
})
