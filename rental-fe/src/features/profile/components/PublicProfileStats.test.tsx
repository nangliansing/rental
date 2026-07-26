import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PublicProfileStats } from "./PublicProfileStats"

describe("PublicProfileStats", () => {
  it("renders normalized listing and review stats", () => {
    render(
      <PublicProfileStats
        listingSummary={{
          activeCount: 3,
          pendingCount: 99,
          rejectedCount: 99,
        }}
        reviewSummary={{
          averageRating: 4.567,
          reviewCount: 2,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 1,
            fiveStars: 1,
          },
          tagCounts: [],
        }}
      />,
    )

    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Listings")).toBeInTheDocument()
    expect(screen.getByText("4.6")).toBeInTheDocument()
    expect(screen.getByText("Rating")).toBeInTheDocument()
    expect(screen.queryByText("Pending")).not.toBeInTheDocument()
  })

  it("shows zero rating when review summary is missing", () => {
    render(
      <PublicProfileStats
        listingSummary={{ activeCount: 1, pendingCount: 0, rejectedCount: 0 }}
      />,
    )

    expect(screen.getByText("0.0")).toBeInTheDocument()
    expect(screen.getByText("Rating")).toBeInTheDocument()
  })
})
