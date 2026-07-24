import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Select } from "./select"

describe("Select", () => {
  it("forwards refs and native attributes", () => {
    const ref = createRef<HTMLSelectElement>()

    render(
      <Select ref={ref} aria-label="Building type" name="buildingType" required>
        <option value="Apartment">Apartment</option>
      </Select>,
    )

    const select = screen.getByRole("combobox", { name: "Building type" })
    expect(ref.current).toBe(select)
    expect(select).toHaveAttribute("data-slot", "select")
    expect(select).toHaveAttribute("name", "buildingType")
    expect(select).toBeRequired()
  })

  it("preserves native option selection behavior", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Select aria-label="Building type" defaultValue="Apartment" onChange={onChange}>
        <option value="Apartment">Apartment</option>
        <option value="Condo">Condo</option>
      </Select>,
    )

    const select = screen.getByRole("combobox", { name: "Building type" })
    await user.selectOptions(select, "Condo")

    expect(select).toHaveValue("Condo")
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("exposes disabled and invalid states", () => {
    render(<Select aria-label="Type" disabled aria-invalid="true" />)

    const select = screen.getByRole("combobox", { name: "Type" })
    expect(select).toBeDisabled()
    expect(select).toHaveAttribute("aria-invalid", "true")
  })

  it("merges caller classes over conflicting defaults", () => {
    render(<Select aria-label="Large" className="h-12 px-4" />)

    const select = screen.getByRole("combobox", { name: "Large" })
    expect(select).toHaveClass("h-12", "px-4")
    expect(select).not.toHaveClass("h-9", "px-2.5")
  })
})
