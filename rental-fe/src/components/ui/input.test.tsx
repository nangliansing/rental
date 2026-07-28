import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Input } from "./input"

describe("Input", () => {
  it("uses native text input behavior by default", () => {
    render(<Input aria-label="Search" />)

    const input = screen.getByRole("textbox", { name: "Search" })

    expect(input).toHaveAttribute("type", "text")
    expect(input).toHaveAttribute("data-slot", "input")
  })

  it("forwards refs and native attributes", () => {
    const ref = createRef<HTMLInputElement>()

    render(
      <Input
        ref={ref}
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />,
    )

    expect(ref.current).toBe(document.getElementById("email"))
    expect(ref.current).toHaveAttribute("name", "email")
    expect(ref.current).toHaveAttribute("autocomplete", "email")
    expect(ref.current).toBeRequired()
  })

  it("works with a native label and accepts typed input", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <label htmlFor="display-name">
        Display name
        <Input id="display-name" onChange={onChange} />
      </label>,
    )

    const input = screen.getByRole("textbox", { name: "Display name" })
    await user.type(input, "Nang")

    expect(input).toHaveValue("Nang")
    expect(onChange).toHaveBeenCalledTimes(4)
  })

  it("preserves numeric input semantics", () => {
    render(
      <Input
        aria-label="Rent"
        type="number"
        inputMode="decimal"
        min={0}
        max={100_000}
      />,
    )

    const input = screen.getByRole("spinbutton", { name: "Rent" })

    expect(input).toHaveAttribute("type", "number")
    expect(input).toHaveAttribute("inputmode", "decimal")
    expect(input).toHaveAttribute("min", "0")
    expect(input).toHaveAttribute("max", "100000")
  })

  it("exposes disabled and invalid states to assistive technology", () => {
    render(<Input aria-label="Phone" disabled aria-invalid="true" />)

    const input = screen.getByRole("textbox", { name: "Phone" })

    expect(input).toBeDisabled()
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveClass("aria-invalid:border-red-500")
  })

  it("merges caller classes over conflicting defaults", () => {
    render(<Input aria-label="Compact" className="h-12 px-4" />)

    const input = screen.getByRole("textbox", { name: "Compact" })

    expect(input).toHaveClass("h-12", "px-4")
    expect(input).not.toHaveClass("h-8", "px-2.5")
  })
})
