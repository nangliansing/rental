import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ClientRequestListItem } from "./ClientRequestListItem"

describe("ClientRequestListItem", () => {
  it("renders name, preview, timestamp, and a name-initial avatar", () => {
    render(
      <ClientRequestListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="3:00 PM"
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText("Sukhumvit 2BR")).toBeInTheDocument()
    expect(screen.getByText("Near BTS")).toBeInTheDocument()
    expect(screen.getByText("3:00 PM")).toBeInTheDocument()
    expect(screen.getByText("S")).toBeInTheDocument()
  })

  it("marks the selected row and notifies on click", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <ClientRequestListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="Yesterday"
        selected
        onSelect={onSelect}
      />,
    )

    const row = screen.getByRole("button", { name: /Sukhumvit 2BR/i })
    expect(row).toHaveAttribute("aria-selected", "true")
    expect(row).toHaveClass("bg-slate-100")
    expect(row).not.toHaveClass("border-b")

    await user.click(row)
    expect(onSelect).toHaveBeenCalledWith("cr-1")
  })
})
