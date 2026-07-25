import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { RouteAccessibility } from "./RouteAccessibility"
import { getRouteTitle } from "./route-title"

describe("RouteAccessibility", () => {
  it.each([
    ["/", "Search rentals"],
    ["/login", "Sign in"],
    ["/listings/new", "Create listing"],
    ["/listings/listing-1", "Listing details"],
    ["/listings/listing-1/edit", "Edit listing"],
    ["/listers/lister-1", "Lister profile"],
  ])("maps %s to an accessible title", (pathname, title) => {
    expect(getRouteTitle(pathname)).toBe(title)
  })

  it("updates the document title and live region", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <RouteAccessibility />
      </MemoryRouter>,
    )

    expect(document.title).toBe("Profile | Rental")
    expect(screen.getByText("Profile")).toHaveAttribute("aria-live", "polite")
  })
})
