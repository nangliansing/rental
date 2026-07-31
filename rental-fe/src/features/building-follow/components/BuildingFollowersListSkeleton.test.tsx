import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingFollowersListSkeleton } from "./BuildingFollowersListSkeleton"

describe("BuildingFollowersListSkeleton", () => {
  it("exposes an accessible loading state", () => {
    render(<BuildingFollowersListSkeleton />)

    expect(screen.getByLabelText("Loading building followers")).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("renders four placeholder rows by default", () => {
    const { container } = render(<BuildingFollowersListSkeleton />)

    expect(container.querySelectorAll(".rounded-full")).toHaveLength(4)
  })

  it("renders follower placeholders without a count header", () => {
    const { container } = render(<BuildingFollowersListSkeleton />)

    expect(container.querySelector(".border-b")).not.toBeInTheDocument()
    expect(container.querySelector(".divide-y")).not.toBeInTheDocument()
    expect(container.querySelectorAll(".rounded-full")).toHaveLength(4)
  })

  it("supports a custom placeholder count", () => {
    const { container } = render(<BuildingFollowersListSkeleton count={2} />)

    expect(container.querySelectorAll(".rounded-full")).toHaveLength(2)
  })
})
