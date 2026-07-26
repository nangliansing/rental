import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

    render(<ListerProfileActions profile={createListerProfile()} />)

    await user.click(screen.getByRole("button", { name: "Contact" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("renders only share when there are no contact channels", () => {
    render(
      <ListerProfileActions
        profile={createListerProfile({
          phone: null,
          lineUrl: null,
          whatsappPhone: null,
          telegramUrl: null,
          viberPhone: null,
        })}
      />,
    )

    expect(
      screen.queryByRole("button", { name: "Contact" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Share profile" }),
    ).toBeInTheDocument()
  })
})
