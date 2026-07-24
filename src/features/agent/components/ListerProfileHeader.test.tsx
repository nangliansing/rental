import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

describe("ListerProfileHeader", () => {
  it("renders identity, online status, contacts, stats, and share affordance", () => {
    render(<ListerProfileHeader profile={createListerProfile()} />)

    expect(screen.getByText("Nang Lian Sing")).toBeInTheDocument()
    expect(screen.getByLabelText("Online lister")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Phone" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Line" })).toBeInTheDocument()
    expect(screen.getByText("Listings")).toBeInTheDocument()
    expect(screen.getByText("Reviews")).toBeInTheDocument()
    expect(screen.getByText("4.5")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Share profile" }),
    ).toBeInTheDocument()
  })

  it("opens and closes the share modal", async () => {
    const user = userEvent.setup()

    render(<ListerProfileHeader profile={createListerProfile()} />)

    await user.click(screen.getByRole("button", { name: "Share profile" }))
    expect(
      screen.getByRole("dialog", { name: "Share profile" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close share dialog" }))
    expect(
      screen.queryByRole("dialog", { name: "Share profile" }),
    ).not.toBeInTheDocument()
  })

  it("hides rating stat when there are no reviews", () => {
    render(
      <ListerProfileHeader
        profile={createListerProfile({
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
        })}
      />,
    )

    expect(screen.queryByText("Rating")).not.toBeInTheDocument()
  })

  it("shows only share when no contact channels exist", () => {
    render(
      <ListerProfileHeader
        profile={createListerProfile({
          phone: null,
          lineUrl: null,
          whatsappPhone: null,
          telegramUrl: null,
          viberPhone: null,
        })}
      />,
    )

    expect(screen.queryByRole("button", { name: "Phone" })).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Share profile" }),
    ).toBeInTheDocument()
  })
})
