import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { createListerProfile } from "@/test/fixtures/listerProfile"

import { ListerProfileActions } from "./ListerProfileActions"

vi.mock("@/features/profile/components/MyProfileShareModal", () => ({
  MyProfileShareModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Share profile">
      <button type="button" onClick={onClose}>
        Close share dialog
      </button>
    </div>
  ),
}))

describe("ListerProfileActions", () => {
  it("opens the contact dialog from the primary action", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ListerProfileActions profile={createListerProfile()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Contact" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("renders only share when there are no contact channels", () => {
    render(
      <MemoryRouter>
        <ListerProfileActions
          profile={createListerProfile({
            phone: null,
            lineUrl: null,
            whatsappPhone: null,
            telegramUrl: null,
            viberPhone: null,
          })}
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole("button", { name: "Contact" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", {
        name: "Search Nang Lian Sing's listings on map",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Share profile" }),
    ).toBeInTheDocument()
  })

  it("hides map search when the lister has no active listings", () => {
    render(
      <MemoryRouter>
        <ListerProfileActions
          profile={createListerProfile({
            listingSummary: {
              activeCount: 0,
              pendingCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole("link", {
        name: /listings on map/i,
      }),
    ).not.toBeInTheDocument()
  })
})
