import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { createListerProfile } from "@/test/fixtures/listerProfile"

import { ListerProfileHeader } from "./ListerProfileHeader"

vi.mock("@/features/profile/components/MyProfileShareModal", () => ({
  MyProfileShareModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Share profile">
      <button type="button" onClick={onClose}>
        Close share dialog
      </button>
    </div>
  ),
}))

function renderListerProfileHeader(
  profile = createListerProfile(),
) {
  return render(
    <MemoryRouter>
      <ListerProfileHeader profile={profile} />
    </MemoryRouter>,
  )
}

describe("ListerProfileHeader", () => {
  it("renders identity, online status, contact chips, stats, and share affordance", () => {
    renderListerProfileHeader()

    expect(
      screen.getByRole("heading", { name: "Nang Lian Sing" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Since Jul 2026 · English · Thai")).toBeInTheDocument()
    expect(screen.getByLabelText("Online lister")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Contact" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Line" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Phone" })).toBeInTheDocument()
    expect(screen.getByText("Listings")).toBeInTheDocument()
    expect(screen.getByText("Reviews")).toBeInTheDocument()
    expect(screen.getByText("4.5")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Share profile" }),
    ).toBeInTheDocument()
  })

  it("opens and closes the share modal", async () => {
    const user = userEvent.setup()

    renderListerProfileHeader()

    await user.click(screen.getByRole("button", { name: "Share profile" }))
    expect(
      screen.getByRole("dialog", { name: "Share profile" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close share dialog" }))
    expect(
      screen.queryByRole("dialog", { name: "Share profile" }),
    ).not.toBeInTheDocument()
  })

  it("shows zero rating when there are no reviews", () => {
    renderListerProfileHeader(
      createListerProfile({
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
      }),
    )

    expect(screen.getByText("0.0")).toBeInTheDocument()
    expect(screen.getByText("Rating")).toBeInTheDocument()
  })

  it("shows only share when no contact channels exist", () => {
    renderListerProfileHeader(
      createListerProfile({
        phone: null,
        lineUrl: null,
        whatsappPhone: null,
        telegramUrl: null,
        viberPhone: null,
      }),
    )

    expect(
      screen.queryByRole("button", { name: "Contact" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Line" })).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Share profile" }),
    ).toBeInTheDocument()
  })
})
