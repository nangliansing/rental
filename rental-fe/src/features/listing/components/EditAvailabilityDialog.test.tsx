import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditAvailabilityDialog } from "./EditAvailabilityDialog"

const referenceDate = new Date("2026-07-29T12:00:00+07:00")

describe("EditAvailabilityDialog", () => {
  it("does not render while closed", () => {
    render(
      <EditAvailabilityDialog
        currentAvailableAt={null}
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens with availability copy and current value", () => {
    render(
      <EditAvailabilityDialog
        currentAvailableAt="2026-07-29T00:00:00+07:00"
        isOpen
        referenceDate={referenceDate}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Availability" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Choose when this room can be moved into."),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Available now/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("forwards a changed availability on save", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EditAvailabilityDialog
        currentAvailableAt={null}
        isOpen
        referenceDate={referenceDate}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

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
})
