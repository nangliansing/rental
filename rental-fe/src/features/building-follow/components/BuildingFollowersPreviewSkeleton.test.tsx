import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingFollowersPreviewSkeleton } from "./BuildingFollowersPreviewSkeleton"
import { BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS } from "../utils/buildingFollowersPreviewLayout"

describe("BuildingFollowersPreviewSkeleton", () => {
  it("exposes an accessible loading state", () => {
    render(<BuildingFollowersPreviewSkeleton />)

    const skeleton = screen.getByLabelText("Loading building followers preview")
    expect(skeleton).toHaveAttribute("aria-busy", "true")
    expect(skeleton).toHaveClass(BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS)
  })

  it("renders three avatar placeholders and a text placeholder", () => {
    const { container } = render(<BuildingFollowersPreviewSkeleton />)

    expect(container.querySelectorAll(".rounded-full")).toHaveLength(3)
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4)
  })

  it("accepts custom class names", () => {
    render(<BuildingFollowersPreviewSkeleton className="mt-4" />)

    expect(
      screen.getByLabelText("Loading building followers preview"),
    ).toHaveClass("mt-4")
  })
})
