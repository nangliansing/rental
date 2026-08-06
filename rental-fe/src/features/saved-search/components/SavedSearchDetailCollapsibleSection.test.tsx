import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SavedSearchDetailCollapsibleSection } from "./SavedSearchDetailCollapsibleSection"

describe("SavedSearchDetailCollapsibleSection", () => {
  it("starts open by default and can collapse", async () => {
    const user = userEvent.setup()

    render(
      <SavedSearchDetailCollapsibleSection
        title="Location"
        collapsedSummary="Asok"
      >
        <p>Map content</p>
      </SavedSearchDetailCollapsibleSection>,
    )

    const toggle = screen.getByRole("button", { name: /Location/i })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Map content")).toBeInTheDocument()
    expect(screen.queryByText("Asok")).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Map content")).not.toBeInTheDocument()
    expect(screen.getByText("Asok")).toBeInTheDocument()
  })

  it("can start closed when defaultOpen is false", () => {
    render(
      <SavedSearchDetailCollapsibleSection
        title="Preferences"
        defaultOpen={false}
        collapsedSummary="2 filters"
      >
        <p>Chips</p>
      </SavedSearchDetailCollapsibleSection>,
    )

    expect(
      screen.getByRole("button", { name: /Preferences/i }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("2 filters")).toBeInTheDocument()
    expect(screen.queryByText("Chips")).not.toBeInTheDocument()
  })
})
