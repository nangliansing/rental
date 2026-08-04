import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AvailableByFilterField } from "@/features/map-search/components/filters/AvailableByFilterField"
import { DialogShell } from "@/shared/components/dialogs/DialogShell"

describe("AvailableByFilterField inside DialogShell", () => {
  it("opens the date picker above the parent dialog and remains interactive", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DialogShell isOpen onDismiss={vi.fn()}>
        <AvailableByFilterField
          id="available-by-nested"
          value={null}
          onChange={onChange}
          referenceDate={new Date("2026-08-04T12:00:00.000Z")}
        />
      </DialogShell>,
    )

    await user.click(screen.getByRole("button", { name: /Flexible/i }))

    const picker = await screen.findByRole("dialog", {
      name: "Need a room by",
    })

    expect(picker).toHaveClass("z-[1100]")

    const parentDialogContent = document.querySelector(
      '[data-slot="dialog-content"]',
    )
    expect(parentDialogContent).toContainElement(picker)

    await user.click(within(picker).getByRole("button", { name: "Today" }))

    expect(onChange).toHaveBeenCalledWith("2026-08-04")
    expect(
      screen.queryByRole("dialog", { name: "Need a room by" }),
    ).not.toBeInTheDocument()
  })
})
