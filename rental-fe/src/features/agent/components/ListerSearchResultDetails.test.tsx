import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"

import { ListerSearchResultDetails } from "./ListerSearchResultDetails"

function makeLister(
  overrides: Partial<SearchAgentProfile> = {},
): SearchAgentProfile {
  return {
    _id: "agent-1",
    displayName: "Nang Lian Sing",
    profilePhoto: null,
    description: null,
    supportLanguages: ["English", "Myanmar"],
    reviewSummary: {
      averageRating: 4.8,
      reviewCount: 12,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 1,
        fourStars: 2,
        fiveStars: 9,
      },
      tagCounts: [
        { tag: "HELPFUL", count: 8 },
        { tag: "RESPONSIVE", count: 5 },
        { tag: "PROFESSIONAL", count: 2 },
      ],
    },
    isVerified: true,
    isOnline: false,
    createdAt: "2024-03-15T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("ListerSearchResultDetails", () => {
  it("shows since, rating, reviews, and the top two review tags", () => {
    render(<ListerSearchResultDetails lister={makeLister()} />)

    expect(screen.getByText("Nang Lian Sing")).toBeInTheDocument()
    expect(
      screen.getByText("Since Mar 2024 · English · Myanmar"),
    ).toBeInTheDocument()
    expect(screen.getByText("4.8 · 12 reviews")).toBeInTheDocument()
    expect(screen.getByText("Helpful")).toBeInTheDocument()
    expect(screen.getByText("Responsive")).toBeInTheDocument()
    expect(screen.queryByText("Professional")).not.toBeInTheDocument()
  })

  it("shows no-reviews fallback when reviewCount is 0", () => {
    render(
      <ListerSearchResultDetails
        lister={makeLister({
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
            tagCounts: [{ tag: "HELPFUL", count: 1 }],
          },
        })}
      />,
    )

    expect(screen.getByText("No reviews yet")).toBeInTheDocument()
    expect(screen.queryByText("Helpful")).not.toBeInTheDocument()
  })
})
