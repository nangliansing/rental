import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SavedSearchListItem } from "./SavedSearchListItem"

describe("SavedSearchListItem", () => {
  it("renders name, preview, timestamp, and a search icon", () => {
    const { container } = render(
      <SavedSearchListItem
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
    expect(container.querySelector("svg.lucide-search")).toBeInTheDocument()
    expect(screen.queryByText("S")).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/matching buildings/i)).not.toBeInTheDocument()
  })

  it("shows a capped matching-count badge under the timestamp", () => {
    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="Yesterday"
        matchingCount={9}
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText("Yesterday")).toBeInTheDocument()
    expect(
      screen.getByLabelText("9+ matching buildings"),
    ).toHaveTextContent("9+")
  })

  it.each([undefined, null, 0] as const)(
    "hides the matching-count badge when count is %s",
    (matchingCount) => {
      render(
        <SavedSearchListItem
          id="cr-1"
          name="Sukhumvit 2BR"
          preview="Near BTS"
          timestamp="3:00 PM"
          matchingCount={matchingCount}
          selected={false}
          onSelect={vi.fn()}
        />,
      )

      expect(
        screen.queryByLabelText(/matching buildings/i),
      ).not.toBeInTheDocument()
    },
  )

  it("marks the selected row and notifies on click", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="Yesterday"
        matchingCount={3}
        selected
        onSelect={onSelect}
      />,
    )

    const row = screen.getByRole("button", { name: /Sukhumvit 2BR/i })
    expect(row).toHaveAttribute("aria-selected", "true")
    expect(row).toHaveClass("bg-slate-100")
    expect(screen.getByLabelText("3 matching buildings")).toBeInTheDocument()

    await user.click(row)
    expect(onSelect).toHaveBeenCalledWith("cr-1")
  })
})
