import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { SearchAgentProfile } from "@/features/agent"

import { SelectedListersRail } from "./SelectedListersRail"

function makeLister(
  overrides: Partial<SearchAgentProfile> = {},
): SearchAgentProfile {
  return {
    _id: "agent-1",
    displayName: "Alex Agent",
    profilePhoto: null,
    description: null,
    supportLanguages: ["English"],
    reviewSummary: {
      averageRating: 0,
      reviewCount: 0,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 0,
        fiveStars: 0,
      },
      tagCounts: [],
    },
    isVerified: false,
    isOnline: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  }
}

describe("SelectedListersRail", () => {
  it("renders nothing when there are no selected listers", () => {
    const { container } = render(
      <SelectedListersRail listers={[]} onRemove={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("shows selected listers in a horizontal list and supports remove", async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    render(
      <SelectedListersRail
        listers={[
          makeLister(),
          makeLister({ _id: "agent-2", displayName: "Bella Broker" }),
        ]}
        onRemove={onRemove}
      />,
    )

    const rail = screen.getByRole("list", { name: "Selected listers" })
    expect(rail.className).toContain("overflow-x-auto")
    expect(rail.querySelector(".flex")).toBeTruthy()
    expect(screen.getByText("Alex Agent")).toBeInTheDocument()
    expect(screen.getByText("Bella Broker")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Remove Alex Agent" }))
    expect(onRemove).toHaveBeenCalledWith("agent-1")
  })
})
