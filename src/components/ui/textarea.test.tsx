import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Textarea } from "./textarea"

describe("Textarea", () => {
  it("uses a stable default row count and forwards native attributes", () => {
    const ref = createRef<HTMLTextAreaElement>()

    render(
      <Textarea
        ref={ref}
        aria-label="Description"
        name="description"
        maxLength={500}
      />,
    )

    const textarea = screen.getByRole("textbox", { name: "Description" })
    expect(ref.current).toBe(textarea)
    expect(textarea).toHaveAttribute("rows", "4")
    expect(textarea).toHaveAttribute("data-slot", "textarea")
    expect(textarea).toHaveAttribute("maxlength", "500")
  })

  it("accepts typed input and preserves an explicit row count", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Textarea aria-label="Note" rows={6} onChange={onChange} />)

    const textarea = screen.getByRole("textbox", { name: "Note" })
    await user.type(textarea, "Helpful note")

    expect(textarea).toHaveValue("Helpful note")
    expect(textarea).toHaveAttribute("rows", "6")
    expect(onChange).toHaveBeenCalledTimes(12)
  })

  it("exposes disabled and invalid states", () => {
    render(<Textarea aria-label="Note" disabled aria-invalid="true" />)

    const textarea = screen.getByRole("textbox", { name: "Note" })
    expect(textarea).toBeDisabled()
    expect(textarea).toHaveAttribute("aria-invalid", "true")
  })

  it("merges caller classes over conflicting defaults", () => {
    render(<Textarea aria-label="Compact" className="min-h-12 resize-none" />)

    const textarea = screen.getByRole("textbox", { name: "Compact" })
    expect(textarea).toHaveClass("min-h-12", "resize-none")
    expect(textarea).not.toHaveClass("min-h-24", "resize-y")
  })
})
