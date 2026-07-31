import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingFollowerAvatarStack } from "./BuildingFollowerAvatarStack"

const follower = (id: string, name: string) => ({
  _id: `follow-${id}`,
  userId: id,
  buildingId: "building-1",
  createdAt: undefined,
  updatedAt: undefined,
  user: {
    _id: id,
    name,
    displayName: name,
    profilePhoto: null,
    isVerified: false,
  },
})

describe("BuildingFollowerAvatarStack", () => {
  it("renders nothing when there are no followers", () => {
    const { container } = render(
      <BuildingFollowerAvatarStack followers={[]} total={0} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders up to three overlapping avatars without an overflow chip", () => {
    render(
      <BuildingFollowerAvatarStack
        followers={[
          follower("1", "Alex"),
          follower("2", "Sam"),
          follower("3", "Lee"),
          follower("4", "Kim"),
        ]}
        total={48}
      />,
    )

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
    expect(screen.getByLabelText("Alex profile photo")).toBeInTheDocument()
    expect(screen.getByLabelText("Sam profile photo")).toBeInTheDocument()
    expect(screen.getByLabelText("Lee profile photo")).toBeInTheDocument()
    expect(screen.queryByLabelText("Kim profile photo")).not.toBeInTheDocument()
  })

  it("respects a custom maxVisible limit defensively", () => {
    render(
      <BuildingFollowerAvatarStack
        followers={[
          follower("1", "Alex"),
          follower("2", "Sam"),
        ]}
        total={2}
        maxVisible={1}
      />,
    )

    expect(screen.getByLabelText("Alex profile photo")).toBeInTheDocument()
    expect(screen.queryByLabelText("Sam profile photo")).not.toBeInTheDocument()
  })

  it("renders a single avatar without overlap spacing", () => {
    const { container } = render(
      <BuildingFollowerAvatarStack
        followers={[follower("1", "Alex")]}
        total={1}
      />,
    )

    expect(screen.getByLabelText("Alex profile photo")).toBeInTheDocument()
    expect(container.querySelector(".-ml-1\\.5")).not.toBeInTheDocument()
  })
})
