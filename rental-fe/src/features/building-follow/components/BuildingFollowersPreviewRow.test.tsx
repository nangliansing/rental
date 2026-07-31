import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BuildingFollowersPreviewRow } from "./BuildingFollowersPreviewRow"

const follower = {
  _id: "follow-1",
  userId: "user-1",
  buildingId: "building-1",
  createdAt: undefined,
  updatedAt: undefined,
  user: {
    _id: "user-1",
    name: "Jane Doe",
    displayName: "Fetch Agent",
    profilePhoto: null,
    isVerified: false,
  },
}

describe("BuildingFollowersPreviewRow", () => {
  it("renders avatars and social proof in one tappable row", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()

    render(
      <BuildingFollowersPreviewRow
        buildingName="Sky Tower"
        followers={[follower]}
        totalFollowers={48}
        hasFollowers
        onOpen={onOpen}
      />,
    )

    expect(screen.getByText(/and 47 others follow this building/)).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "View all 48 followers of Sky Tower",
      }),
    )

    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("renders the empty-state copy without avatars", () => {
    render(
      <BuildingFollowersPreviewRow
        buildingName="Sky Tower"
        followers={[]}
        totalFollowers={0}
        hasFollowers={false}
      />,
    )

    expect(
      screen.getByText("No one follows this building yet"),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/profile photo/)).not.toBeInTheDocument()
  })

  it("does not throw when onOpen is omitted", async () => {
    const user = userEvent.setup()

    render(
      <BuildingFollowersPreviewRow
        buildingName="Sky Tower"
        followers={[follower]}
        totalFollowers={1}
        hasFollowers
      />,
    )

    await user.click(
      screen.getByRole("button", {
        name: "View 1 follower of Sky Tower",
      }),
    )
  })
})
