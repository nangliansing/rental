import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { UserMenuFollowedBuildingRow } from "./UserMenuFollowedBuildingRow"

const follow = {
  _id: "follow-1",
  buildingId: "building-1",
  building: {
    _id: "building-1",
    name: "Bangkapi Residence",
    address: "Bang Kapi, Bangkok",
  },
}

describe("UserMenuFollowedBuildingRow", () => {
  it("renders the building link and unfollow action", () => {
    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingRow
          follow={follow}
          onUnfollow={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("article", { name: "Followed building Bangkapi Residence" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bangkapi Residence/i })).toHaveAttribute(
      "href",
      "/buildings/building-1",
    )
    expect(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    ).toBeInTheDocument()
  })

  it("calls onUnfollow without navigating", async () => {
    const user = userEvent.setup()
    const onUnfollow = vi.fn()
    const onNavigate = vi.fn()

    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingRow
          follow={follow}
          onNavigate={onNavigate}
          onUnfollow={onUnfollow}
        />
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    )

    expect(onUnfollow).toHaveBeenCalledWith(follow)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("shows unavailable state without unfollow when the building id is missing", () => {
    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingRow
          follow={{
            _id: "follow-2",
            buildingId: "   ",
            building: null,
          }}
          onUnfollow={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText("Building unavailable")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Unfollow/i })).not.toBeInTheDocument()
  })

  it("still allows unfollow when only the populated building payload is missing", () => {
    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingRow
          follow={{
            _id: "follow-2",
            buildingId: "building-2",
            building: null,
          }}
          onUnfollow={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole("link", { name: /Building building-2/i })).toHaveAttribute(
      "href",
      "/buildings/building-2",
    )
    expect(
      screen.getByRole("button", { name: "Unfollow Building building-2" }),
    ).toBeInTheDocument()
  })

  it("disables unfollow while the row is pending", () => {
    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingRow
          follow={follow}
          isUnfollowing
          onUnfollow={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    ).toBeDisabled()
  })

  it("disables unfollow while another row is pending", () => {
    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingRow
          follow={follow}
          isDisabled
          onUnfollow={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    ).toBeDisabled()
  })
})
