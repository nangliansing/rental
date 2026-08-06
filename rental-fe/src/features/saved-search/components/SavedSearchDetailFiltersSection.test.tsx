import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SavedSearchDetailFiltersSection } from "./SavedSearchDetailFiltersSection"

describe("SavedSearchDetailFiltersSection", () => {
  it("is collapsed by default and shows a filter count summary", () => {
    render(
      <SavedSearchDetailFiltersSection
        filters={{ bedroomCount: 1, occupancy: 2 }}
      />,
    )

    const toggle = screen.getByRole("button", { name: /Preferences/i })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("2 filters")).toBeInTheDocument()
    expect(screen.queryByText(/1\+ bed/i)).not.toBeInTheDocument()
  })

  it("expands to show preference chips", async () => {
    const user = userEvent.setup()

    render(
      <SavedSearchDetailFiltersSection
        filters={{ bedroomCount: 1, occupancy: 2 }}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Preferences/i }))

    expect(
      screen.getByRole("button", { name: /Preferences/i }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText(/1\+ bed/i)).toBeInTheDocument()
    expect(screen.getByText(/2 people/i)).toBeInTheDocument()
    expect(screen.queryByText("2 filters")).not.toBeInTheDocument()
  })

  it("shows none-set summary and empty copy when opened without filters", async () => {
    const user = userEvent.setup()

    render(<SavedSearchDetailFiltersSection filters={{}} />)

    expect(screen.getByText("None set")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Preferences/i }))

    expect(
      screen.getByText("No preference filters were saved with this search."),
    ).toBeInTheDocument()
  })
})
