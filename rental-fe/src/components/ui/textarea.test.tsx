import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Textarea } from "./textarea"

describe("Textarea", () => {
  it("renders as a borderless plain field", () => {
    const ref = createRef<HTMLTextAreaElement>()

    render(
      <Textarea
        ref={ref}
        aria-label="Description"
        name="description"
        placeholder="Type your message here."
      />,
    )

    const textarea = screen.getByRole("textbox", { name: "Description" })
    expect(ref.current).toBe(textarea)
    expect(textarea).toHaveAttribute("data-slot", "textarea")
    expect(textarea).toHaveAttribute("placeholder", "Type your message here.")
    expect(textarea).toHaveClass(
      "field-sizing-content",
      "min-h-16",
      "border-0",
      "bg-transparent",
      "p-0",
      "outline-none",
      "placeholder:text-slate-300",
    )
  })

  it("accepts typed input", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Textarea aria-label="Note" onChange={onChange} />)

    const textarea = screen.getByRole("textbox", { name: "Note" })
    await user.type(textarea, "Helpful note")

    expect(textarea).toHaveValue("Helpful note")
    expect(onChange).toHaveBeenCalledTimes(12)
  })

  it("exposes disabled and invalid states", () => {
    render(<Textarea aria-label="Note" disabled aria-invalid="true" />)

    const textarea = screen.getByRole("textbox", { name: "Note" })
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveAttribute("aria-invalid", "true")
  })
})
