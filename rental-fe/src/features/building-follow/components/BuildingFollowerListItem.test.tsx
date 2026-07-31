import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BuildingFollowerListItem } from "./BuildingFollowerListItem"

const follower = {
  _id: "follow-1",
  userId: "user-1",
  buildingId: "building-1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
  user: {
    _id: "user-1",
    name: "Jane Doe",
    displayName: "Fetch Agent",
    profilePhoto: null,
    isVerified: true,
  },
}

describe("BuildingFollowerListItem", () => {
  it("renders avatar, display name, and followed since", () => {
    render(<BuildingFollowerListItem follower={follower} />)

    expect(
      screen.getByRole("article", { name: "Follower Fetch Agent" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Fetch Agent")).toBeInTheDocument()
    expect(screen.getByText("Followed Jul 31, 2026")).toBeInTheDocument()
    expect(screen.getByLabelText("Verified follower")).toBeInTheDocument()
  })

  it("falls back defensively when user data is missing", () => {
    render(
      <BuildingFollowerListItem
        follower={{
          ...follower,
          user: null,
        }}
      />,
    )

    expect(screen.getByText("User user-1")).toBeInTheDocument()
  })

  it("shows an unfollow action only for the viewer row", async () => {
    const user = userEvent.setup()
    const onUnfollow = vi.fn()

    const { rerender } = render(
      <BuildingFollowerListItem
        follower={follower}
        isViewer
        onUnfollow={onUnfollow}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Unfollow Fetch Agent" }))
    expect(onUnfollow).toHaveBeenCalledOnce()

    rerender(<BuildingFollowerListItem follower={follower} onUnfollow={onUnfollow} />)
    expect(
      screen.queryByRole("button", { name: /Unfollow/i }),
    ).not.toBeInTheDocument()
  })

  it("disables unfollow while the mutation is pending", () => {
    render(
      <BuildingFollowerListItem
        follower={follower}
        isViewer
        isUnfollowing
        onUnfollow={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow Fetch Agent" }),
    ).toBeDisabled()
  })

  it("shows a loader icon while unfollow is pending", () => {
    render(
      <BuildingFollowerListItem
        follower={follower}
        isViewer
        isUnfollowing
        onUnfollow={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: "Unfollow Fetch Agent" })
    expect(button.querySelector("svg")).toHaveClass("animate-spin")
  })
})
