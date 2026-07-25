import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, test, vi } from "vitest"

import {
  SingleOptionSelector,
  type SingleOptionActiveColor,
  type SingleOptionSize,
} from "./SingleOptionSelector"

const OPTIONS = [
  { label: "Studio", value: 0 },
  { label: "One bedroom", value: 1 },
] as const

describe("SingleOptionSelector", () => {
  it("renders an accessible group with medium, black defaults", () => {
    render(
      <SingleOptionSelector
        label="Bedrooms"
        options={OPTIONS}
        value={1}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("group", { name: "Bedrooms" })).toBeInTheDocument()

    const selected = screen.getByRole("button", { name: "One bedroom" })
    expect(selected).toHaveAttribute("aria-pressed", "true")
    expect(selected).toHaveClass("min-h-9", "bg-slate-950")

    expect(screen.getByRole("button", { name: "Studio" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("selects a numeric option", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SingleOptionSelector options={OPTIONS} onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "Studio" }))

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it("clears an optional selected option", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SingleOptionSelector options={OPTIONS} value={1} onChange={onChange} />,
    )

    await user.click(screen.getByRole("button", { name: "One bedroom" }))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("does not clear or emit a redundant change when required", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SingleOptionSelector
        label="Bedrooms"
        options={OPTIONS}
        value={1}
        required
        onChange={onChange}
      />,
    )

    expect(screen.getByRole("group", { name: "Bedrooms" })).toHaveAttribute(
      "aria-required",
      "true",
    )

    await user.click(screen.getByRole("button", { name: "One bedroom" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("disables every option and blocks changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SingleOptionSelector
        options={OPTIONS}
        disabled
        onChange={onChange}
      />,
    )

    const option = screen.getByRole("button", { name: "Studio" })
    expect(option).toBeDisabled()

    await user.click(option)
    expect(onChange).not.toHaveBeenCalled()
  })

  test.each([
    ["black", "bg-slate-950"],
    ["blue", "bg-blue-600"],
    ["green", "bg-green-600"],
    ["red", "bg-red-600"],
  ] satisfies [SingleOptionActiveColor, string][])(
    "supports the %s active color",
    (activeColor, expectedClass) => {
      render(
        <SingleOptionSelector
          options={OPTIONS}
          value={1}
          activeColor={activeColor}
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: "One bedroom" })).toHaveClass(
        expectedClass,
      )
    },
  )

  test.each([
    ["small", "min-h-8"],
    ["medium", "min-h-9"],
    ["large", "min-h-10"],
  ] satisfies [SingleOptionSize, string][])(
    "supports the %s size",
    (size, expectedClass) => {
      render(
        <SingleOptionSelector options={OPTIONS} size={size} onChange={vi.fn()} />,
      )

      expect(screen.getByRole("button", { name: "Studio" })).toHaveClass(
        expectedClass,
      )
    },
  )

  it("handles missing options without throwing", () => {
    render(
      <SingleOptionSelector label="Bedrooms" options={undefined} onChange={vi.fn()} />,
    )

    expect(screen.getByRole("group", { name: "Bedrooms" })).toBeInTheDocument()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })
})
