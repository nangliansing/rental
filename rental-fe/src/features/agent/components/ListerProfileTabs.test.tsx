import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListerProfileTabs } from "./ListerProfileTabs"

describe("ListerProfileTabs", () => {
  it("renders lister tabs with labels and no placeholder tab", () => {
    render(
      <ListerProfileTabs
        activeTab="listings"
        activeSort="latest"
        onTabChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("tab", { name: "Listings" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Reviews" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Recommend" })).not.toBeInTheDocument()
  })

  it("shows listing sort controls only on the listings tab", async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    const onSortChange = vi.fn()

    render(
      <ListerProfileTabs
        activeTab="listings"
        activeSort="latest"
        onTabChange={onTabChange}
        onSortChange={onSortChange}
      />,
    )

    expect(screen.getByRole("tab", { name: "Listings" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tablist", { name: "Listing sort" })).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Reviews" }))
    expect(onTabChange).toHaveBeenCalledWith("reviews")
  })

  it("hides listing sort controls on the reviews tab", () => {
    render(
      <ListerProfileTabs
        activeTab="reviews"
        activeSort="latest"
        onTabChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole("tablist", { name: "Listing sort" }),
    ).not.toBeInTheDocument()
  })

  it("changes listing sort when a sort option is selected", async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()

    render(
      <ListerProfileTabs
        activeTab="listings"
        activeSort="latest"
        onTabChange={vi.fn()}
        onSortChange={onSortChange}
      />,
    )

    await user.click(screen.getByRole("tab", { name: "Oldest" }))
    expect(onSortChange).toHaveBeenCalledWith("oldest")
  })
})
