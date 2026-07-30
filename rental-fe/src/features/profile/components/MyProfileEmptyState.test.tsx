import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { Grid3X3 } from "lucide-react"

import { MyProfileEmptyState } from "./MyProfileEmptyState"
import { MyProfileListingsEmpty } from "./MyProfileListingsEmpty"

describe("MyProfileEmptyState", () => {
  it("renders an optional action link", () => {
    render(
      <MemoryRouter>
        <MyProfileEmptyState
          icon={Grid3X3}
          title="No listings yet"
          description="Start from the map."
          action={{ label: "Start listing", href: "/?purpose=list" }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("link", { name: "Start listing" }),
    ).toHaveAttribute("href", "/?purpose=list")
  })
})

describe("MyProfileListingsEmpty", () => {
  it("links the all filter empty state to map list mode", () => {
    render(
      <MemoryRouter>
        <MyProfileListingsEmpty filter="all" />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", { name: "No listings yet" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Start listing" }),
    ).toHaveAttribute("href", "/?purpose=list")
  })

  it.each([
    ["now", "No listings available now"],
    ["soon", "No upcoming listings"],
    ["private", "No private listings"],
  ] as const)("renders empty copy for the %s filter without a CTA", (filter, title) => {
    render(
      <MemoryRouter>
        <MyProfileListingsEmpty filter={filter} />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
