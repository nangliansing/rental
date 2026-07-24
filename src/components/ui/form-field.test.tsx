import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FormField } from "./form-field"
import { Input } from "./input"

describe("FormField", () => {
  it("associates its label and required state with the control", () => {
    render(
      <FormField label="Building name" required>
        <Input name="name" />
      </FormField>,
    )

    const input = screen.getByRole("textbox", { name: "Building name" })

    expect(input).toHaveAttribute("id")
    expect(input).toBeRequired()
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  })

  it("wires descriptions and errors without discarding existing references", () => {
    render(
      <>
        <p id="external-help">External help</p>
        <FormField
          label="Email"
          description="Used for account notices"
          error="Enter a valid email"
        >
          <Input id="email" aria-describedby="external-help" />
        </FormField>
      </>,
    )

    const input = screen.getByRole("textbox", { name: "Email" })
    const description = screen.getByText("Used for account notices")
    const error = screen.getByRole("alert")

    expect(input).toHaveAttribute(
      "aria-describedby",
      `external-help ${description.id} ${error.id}`,
    )
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("does not add empty description or error elements", () => {
    render(
      <FormField label="Address" description="" error="">
        <Input />
      </FormField>,
    )

    const input = screen.getByRole("textbox", { name: "Address" })

    expect(input).not.toHaveAttribute("aria-describedby")
    expect(input).not.toHaveAttribute("aria-invalid")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("preserves explicit control accessibility attributes", () => {
    render(
      <FormField label="Phone">
        <Input required aria-invalid="true" />
      </FormField>,
    )

    const input = screen.getByRole("textbox", { name: "Phone" })
    expect(input).toBeRequired()
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("handles a missing control without throwing", () => {
    render(<FormField label="Unavailable field" />)

    expect(screen.getByText("Unavailable field")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })
})
