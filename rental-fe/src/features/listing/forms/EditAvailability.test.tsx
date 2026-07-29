import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditAvailability } from "./EditAvailability"

const referenceDate = new Date("2026-07-29T12:00:00+07:00")

describe("EditAvailability", () => {
  it("disables save until availability changes", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EditAvailability
        currentAvailableAt={null}
        referenceDate={referenceDate}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /Flexible/i }))
    const picker = screen.getByRole("dialog", {
      name: "When is the room available?",
    })
    await user.click(
      within(picker).getByRole("button", { name: "Available now" }),
    )
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith("2026-07-29")
  })

  it("forwards error and submitting state", () => {
    render(
      <EditAvailability
        currentAvailableAt={null}
        isSubmitting
        errorMessage="  Could not update listing availability.  "
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update listing availability.",
    )
  })
})
