import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListerProfileTabs } from "./ListerProfileTabs"

describe("ListerProfileTabs", () => {
  it("renders lister tabs with labels and no placeholder tab", () => {
    render(
      <ListerProfileTabs
        activeTab="listings"
        activeFilter="all"
        activeSort="latest"
        onTabChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("tab", { name: "Listings" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Reviews" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Recommend" })).not.toBeInTheDocument()
  })

  it("shows listing filter and sort controls only on the listings tab", async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    const onFilterChange = vi.fn()
    const onSortChange = vi.fn()

    render(
      <ListerProfileTabs
        activeTab="listings"
        activeFilter="all"
        activeSort="latest"
        onTabChange={onTabChange}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
      />,
    )

    expect(screen.getByRole("tab", { name: "Listings" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tablist", { name: "Listing filters" })).toBeInTheDocument()
    expect(document.getElementById("lister-profile-listing-sort")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Reviews" }))
    expect(onTabChange).toHaveBeenCalledWith("reviews")
  })

  it("hides listing controls on the reviews tab", () => {
    render(
      <ListerProfileTabs
        activeTab="reviews"
        activeFilter="all"
        activeSort="latest"
        onTabChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole("tablist", { name: "Listing filters" }),
    ).not.toBeInTheDocument()
    expect(document.getElementById("lister-profile-listing-sort")).toBeNull()
  })

  it("changes listing filter and sort when options are selected", async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    const onSortChange = vi.fn()

    render(
      <ListerProfileTabs
        activeTab="listings"
        activeFilter="all"
        activeSort="latest"
        onTabChange={vi.fn()}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
      />,
    )

    await user.click(screen.getByRole("tab", { name: "Now" }))
    expect(onFilterChange).toHaveBeenCalledWith("now")

    await user.selectOptions(
      document.getElementById("lister-profile-listing-sort") as HTMLSelectElement,
      "oldest",
    )
    expect(onSortChange).toHaveBeenCalledWith("oldest")
  })

  it("shows soonest-first hint and hides sort dropdown on the soon filter", () => {
    render(
      <ListerProfileTabs
        activeTab="listings"
        activeFilter="soon"
        activeSort="latest"
        onTabChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Soonest first")).toBeInTheDocument()
    expect(document.getElementById("lister-profile-listing-sort")).toBeNull()
  })
})
