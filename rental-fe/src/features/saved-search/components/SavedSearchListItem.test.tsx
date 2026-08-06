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
    expect(
      screen.queryByLabelText(/matching buildings/i),
    ).not.toBeInTheDocument()
  })

  it("shows separate caller and platform counts", () => {
    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="Yesterday"
        myMatchingBuildingCount={3}
        platformMatchingBuildingCount={7}
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText("Yesterday")).toBeInTheDocument()
    expect(screen.getByLabelText(/3 matching buildings from your/i)).toHaveTextContent(
      "Yours3",
    )
    expect(
      screen.getByLabelText(/7 matching buildings from platform/i),
    ).toHaveTextContent("Platform7")
    expect(screen.queryByText("20+ total")).not.toBeInTheDocument()
  })

  it("hides zero matching-count chips", () => {
    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="3:00 PM"
        myMatchingBuildingCount={0}
        platformMatchingBuildingCount={0}
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.queryByText("Yours")).not.toBeInTheDocument()
    expect(screen.queryByText("Platform")).not.toBeInTheDocument()
  })

  it("shows only non-zero matching-count chips", () => {
    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="3:00 PM"
        myMatchingBuildingCount={0}
        platformMatchingBuildingCount={4}
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.queryByText("Yours")).not.toBeInTheDocument()
    expect(
      screen.getByLabelText(/4 matching buildings from platform/i),
    ).toBeVisible()
  })

  it("shows a clear lower-bound total when counts are capped", () => {
    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="Yesterday"
        myMatchingBuildingCount={4}
        platformMatchingBuildingCount={16}
        matchingBuildingCountCapped
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText("20+ total")).toBeVisible()
    expect(screen.getByLabelText(/counts are capped/i)).toHaveAttribute(
      "title",
      expect.stringContaining("first 20"),
    )
  })

  it("hides the count group when either API count is unavailable", () => {
    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="3:00 PM"
        myMatchingBuildingCount={2}
        platformMatchingBuildingCount={null}
        selected={false}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.queryByText("Yours")).not.toBeInTheDocument()
    expect(screen.queryByText("Platform")).not.toBeInTheDocument()
  })

  it("marks the selected row and notifies on click", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <SavedSearchListItem
        id="cr-1"
        name="Sukhumvit 2BR"
        preview="Near BTS"
        timestamp="Yesterday"
        myMatchingBuildingCount={3}
        platformMatchingBuildingCount={2}
        selected
        onSelect={onSelect}
      />,
    )

    const row = screen.getByRole("button", { name: /Sukhumvit 2BR/i })
    expect(row).toHaveAttribute("aria-selected", "true")
    expect(row).toHaveClass("bg-slate-100")
    expect(
      screen.getByLabelText("3 matching buildings from your listings"),
    ).toBeInTheDocument()

    await user.click(row)
    expect(onSelect).toHaveBeenCalledWith("cr-1")
  })
})
