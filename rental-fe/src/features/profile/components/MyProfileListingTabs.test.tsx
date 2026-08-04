import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { MyProfileListingTabs } from "./MyProfileListingTabs"

function renderListingTabs(
  overrides: Partial<{
    activeListingFilter: "all" | "now" | "soon" | "private"
    activeListingSort: "latest" | "oldest"
  }> = {},
) {
  const onListingFilterChange = vi.fn()
  const onListingSortChange = vi.fn()

  render(
    <MyProfileListingTabs
      activeTab="listings"
      activeListingFilter={overrides.activeListingFilter ?? "all"}
      activeListingSort={overrides.activeListingSort ?? "latest"}
      activePendingFilter="all"
      onTabChange={vi.fn()}
      onListingFilterChange={onListingFilterChange}
      onListingSortChange={onListingSortChange}
      onPendingFilterChange={vi.fn()}
    />,
  )

  return { onListingFilterChange, onListingSortChange }
}

describe("MyProfileListingTabs section tabs", () => {
  it("includes Requests and omits Saved among profile sections", () => {
    render(
      <MyProfileListingTabs
        activeTab="requests"
        activeListingFilter="all"
        activeListingSort="latest"
        activePendingFilter="all"
        onTabChange={vi.fn()}
        onListingFilterChange={vi.fn()}
        onListingSortChange={vi.fn()}
        onPendingFilterChange={vi.fn()}
      />,
    )

    const sections = screen.getByRole("tablist", { name: "Profile sections" })
    expect(
      within(sections).getByRole("tab", { name: "Requests" }),
    ).toHaveAttribute("aria-selected", "true")
    expect(
      within(sections).queryByRole("tab", { name: "Saved" }),
    ).not.toBeInTheDocument()
  })
})

describe("MyProfileListingTabs listing controls", () => {
  it("renders all owner listing filter tabs", () => {
    renderListingTabs()

    const filters = screen.getByRole("tablist", { name: "Listing filters" })

    expect(filters).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "Now" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Soon" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Private" })).toBeInTheDocument()
  })

  it("shows the sort dropdown for non-soon filters", () => {
    renderListingTabs({ activeListingFilter: "all" })

    const sortSelect = document.getElementById(
      "my-profile-listing-sort",
    ) as HTMLSelectElement

    expect(sortSelect).toBeInTheDocument()
    expect(sortSelect).toHaveValue("latest")
    expect(screen.queryByText("Soonest first")).not.toBeInTheDocument()
  })

  it("shows a soonest-first hint instead of sort controls on the Soon tab", () => {
    renderListingTabs({ activeListingFilter: "soon" })

    expect(screen.getByText("Soonest first")).toBeInTheDocument()
    expect(
      screen.getByLabelText("Sorted by soonest availability"),
    ).toBeInTheDocument()
    expect(document.getElementById("my-profile-listing-sort")).toBeNull()
    expect(screen.queryByText("Latest")).not.toBeInTheDocument()
  })

  it("notifies parent components when a listing filter tab changes", async () => {
    const user = userEvent.setup()
    const { onListingFilterChange } = renderListingTabs()

    await user.click(screen.getByRole("tab", { name: "Now" }))

    expect(onListingFilterChange).toHaveBeenCalledWith("now")
  })

  it("notifies parent components when the listing sort changes", async () => {
    const user = userEvent.setup()
    const { onListingSortChange } = renderListingTabs()

    const sortSelect = document.getElementById(
      "my-profile-listing-sort",
    ) as HTMLSelectElement

    await user.selectOptions(sortSelect, "oldest")

    expect(onListingSortChange).toHaveBeenCalledWith("oldest")
  })
})
