import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingListingsSectionHeader } from "./BuildingListingsSectionHeader"

describe("BuildingListingsSectionHeader", () => {
  it("renders the listing count on the left", () => {
    render(<BuildingListingsSectionHeader totalListings={3} />)

    expect(screen.getByText("3 available listings")).toBeInTheDocument()
  })

  it("shows an icon-only loader on the right while refreshing", () => {
    const { container } = render(
      <BuildingListingsSectionHeader totalListings={3} isRefreshing />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("3 available listings")
    expect(screen.getByText("Updating listings")).toHaveClass("sr-only")
    expect(screen.queryByText("Updating listings...")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toHaveClass("animate-spin")
  })

  it("does not expose a live region or loader when idle", () => {
    const { container } = render(
      <BuildingListingsSectionHeader totalListings={3} />,
    )

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByText("Updating listings")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).not.toBeInTheDocument()
  })

  it("supports zero listings and custom layout classes", () => {
    render(
      <BuildingListingsSectionHeader
        totalListings={0}
        className="custom-header"
      />,
    )

    expect(screen.getByText("0 available listings")).toBeInTheDocument()
    expect(screen.getByText("0 available listings").parentElement).toHaveClass(
      "custom-header",
    )
  })
})
