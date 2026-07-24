import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, test, vi } from "vitest"

import {
  MultiOptionSelector,
  type MultiOptionActiveColor,
  type MultiOptionSize,
} from "./MultiOptionSelector"

const OPTIONS = [
  { label: "English", value: "English" },
  { label: "Thai", value: "Thai" },
] as const

describe("MultiOptionSelector", () => {
  it("renders an accessible group with medium, black defaults", () => {
    render(
      <MultiOptionSelector
        label="Languages"
        options={OPTIONS}
        value={["English"]}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("group", { name: "Languages" })).toBeInTheDocument()

    const selected = screen.getByRole("button", { name: "English" })
    expect(selected).toHaveAttribute("aria-pressed", "true")
    expect(selected).toHaveClass("min-h-9", "bg-slate-950")

    expect(screen.getByRole("button", { name: "Thai" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("exposes a required group and visual indicator", () => {
    render(
      <MultiOptionSelector
        label="Languages"
        description="Choose at least one language"
        options={OPTIONS}
        required
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("group", { name: "Languages" })).toHaveAttribute(
      "aria-required",
      "true",
    )
    expect(screen.getByRole("group", { name: "Languages" })).toHaveAccessibleDescription(
      "Choose at least one language",
    )
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  })

  it("adds an option without mutating the current value", async () => {
    const user = userEvent.setup()
    const value = ["English"]
    const onChange = vi.fn()

    render(
      <MultiOptionSelector options={OPTIONS} value={value} onChange={onChange} />,
    )

    await user.click(screen.getByRole("button", { name: "Thai" }))

    expect(onChange).toHaveBeenCalledWith(["English", "Thai"])
    expect(value).toEqual(["English"])
  })

  it("removes a selected option and returns undefined when none remain", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiOptionSelector
        options={OPTIONS}
        value={["English"]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "English" }))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("disables every option and blocks changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiOptionSelector options={OPTIONS} disabled onChange={onChange} />,
    )

    const option = screen.getByRole("button", { name: "English" })
    expect(option).toBeDisabled()

    await user.click(option)
    expect(onChange).not.toHaveBeenCalled()
  })

  test.each([
    ["black", "bg-slate-950"],
    ["blue", "bg-blue-600"],
    ["green", "bg-green-600"],
    ["red", "bg-red-600"],
  ] satisfies [MultiOptionActiveColor, string][])(
    "supports the %s active color",
    (activeColor, expectedClass) => {
      render(
        <MultiOptionSelector
          options={OPTIONS}
          value={["English"]}
          activeColor={activeColor}
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: "English" })).toHaveClass(
        expectedClass,
      )
    },
  )

  test.each([
    ["small", "min-h-8"],
    ["medium", "min-h-9"],
    ["large", "min-h-10"],
  ] satisfies [MultiOptionSize, string][])(
    "supports the %s size",
    (size, expectedClass) => {
      render(
        <MultiOptionSelector options={OPTIONS} size={size} onChange={vi.fn()} />,
      )

      expect(screen.getByRole("button", { name: "English" })).toHaveClass(
        expectedClass,
      )
    },
  )

  it("handles missing options and values without throwing", () => {
    render(
      <MultiOptionSelector
        label="Languages"
        options={undefined}
        value={undefined}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("group", { name: "Languages" })).toBeInTheDocument()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })
})
