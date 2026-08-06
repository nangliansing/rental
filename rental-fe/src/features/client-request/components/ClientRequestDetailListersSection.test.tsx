import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ClientRequestDetailListersSection } from "./ClientRequestDetailListersSection"

const getListerProfileById = vi.hoisted(() => vi.fn())

vi.mock("@/features/agent/api/getListerProfileById", () => ({
  getListerProfileById,
}))

vi.mock("@/features/agent/lister-map-search/toSearchAgentProfile", () => ({
  listerProfileToSearchAgentProfile: (profile: {
    _id: string
    displayName: string
  }) => ({
    _id: profile._id,
    displayName: profile.displayName,
    profilePhoto: null,
    description: null,
    supportLanguages: [],
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
  }),
}))

describe("ClientRequestDetailListersSection", () => {
  beforeEach(() => {
    getListerProfileById.mockReset()
  })

  it("shows empty copy when no listers are selected", () => {
    render(<ClientRequestDetailListersSection filters={{ bedroomCount: 2 }} />)

    expect(
      screen.getByRole("button", { name: /Preferred listers/i }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByText("No preferred listers were saved with this search."),
    ).toBeInTheDocument()
    expect(getListerProfileById).not.toHaveBeenCalled()
  })

  it("loads and shows selected lister chips", async () => {
    getListerProfileById.mockResolvedValue({
      _id: "agent-1",
      displayName: "Alex Agent",
    })

    render(
      <ClientRequestDetailListersSection
        filters={{ agentProfileIds: ["agent-1"] }}
      />,
    )

    expect(screen.getByText("Loading listers…")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Alex Agent")).toBeInTheDocument()
    })

    expect(getListerProfileById).toHaveBeenCalledWith(
      "agent-1",
      expect.any(AbortSignal),
    )
  })

  it("clears chips when filters lose agentProfileIds", async () => {
    getListerProfileById.mockResolvedValue({
      _id: "agent-1",
      displayName: "Alex Agent",
    })

    const { rerender } = render(
      <ClientRequestDetailListersSection
        filters={{ agentProfileIds: ["agent-1"] }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Alex Agent")).toBeInTheDocument()
    })

    await act(async () => {
      rerender(<ClientRequestDetailListersSection filters={{}} />)
    })

    expect(
      screen.getByText("No preferred listers were saved with this search."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Alex Agent")).not.toBeInTheDocument()
  })

  it("shows a failure message when profile loads fail", async () => {
    getListerProfileById.mockRejectedValue(new Error("not found"))

    render(
      <ClientRequestDetailListersSection
        filters={{ agentProfileIds: ["agent-missing"] }}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          "Couldn’t load preferred listers for this search.",
        ),
      ).toBeInTheDocument()
    })
  })
})
