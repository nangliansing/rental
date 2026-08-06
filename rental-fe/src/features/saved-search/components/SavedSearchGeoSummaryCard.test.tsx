import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SavedSearchGeoSummaryCard } from "./SavedSearchGeoSummaryCard"

describe("SavedSearchGeoSummaryCard", () => {
  it("renders the title and detail copy", () => {
    render(
      <SavedSearchGeoSummaryCard
        title="Visible map area"
        detail="The same area as Search this area on the map."
      />,
    )

    expect(screen.getByText("Visible map area")).toBeInTheDocument()
    expect(
      screen.getByText("The same area as Search this area on the map."),
    ).toBeInTheDocument()
  })

  it("applies the default compact card styles when className is omitted", () => {
    const { container } = render(
      <SavedSearchGeoSummaryCard
        title="Pinned location"
        detail="Pin and 1 km coverage around it."
      />,
    )

    expect(container.firstElementChild).toHaveClass(
      "rounded-xl",
      "border",
      "border-slate-200",
      "bg-slate-50",
      "px-3",
      "py-2.5",
    )
  })

  it("replaces the default styles when className is provided", () => {
    const { container } = render(
      <SavedSearchGeoSummaryCard
        title="Search line"
        detail="Drawn line and 500 m coverage along it."
        className="custom-geo-summary"
      />,
    )

    expect(container.firstElementChild).toHaveClass("custom-geo-summary")
    expect(container.firstElementChild).not.toHaveClass("rounded-xl")
    expect(container.firstElementChild).not.toHaveClass("bg-slate-50")
  })

  it("keeps title and detail hierarchy for each geo summary flavor", () => {
    const { rerender } = render(
      <SavedSearchGeoSummaryCard
        title="Pinned location"
        detail="Pin and 500 m coverage around it."
      />,
    )

    expect(screen.getByText("Pinned location")).toHaveClass(
      "text-sm",
      "font-semibold",
    )
    expect(
      screen.getByText("Pin and 500 m coverage around it."),
    ).toHaveClass("text-xs", "text-slate-600")

    rerender(
      <SavedSearchGeoSummaryCard
        title="Search line"
        detail="Drawn line and 1 km coverage along it."
      />,
    )

    expect(screen.getByText("Search line")).toBeInTheDocument()
    expect(
      screen.getByText("Drawn line and 1 km coverage along it."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Pinned location")).not.toBeInTheDocument()
  })

  it("renders empty strings without throwing", () => {
    const { container } = render(
      <SavedSearchGeoSummaryCard title="" detail="" />,
    )

    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.querySelectorAll("p")).toHaveLength(2)
  })
})
