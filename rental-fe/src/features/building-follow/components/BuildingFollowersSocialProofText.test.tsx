import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingFollowersSocialProofText } from "./BuildingFollowersSocialProofText"

const follower = (name: string, id: string, isVerified = false) => ({
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
    isVerified,
  },
})

describe("BuildingFollowersSocialProofText", () => {
  it("renders the empty preview copy", () => {
    render(<BuildingFollowersSocialProofText followers={[]} total={0} />)

    expect(
      screen.getByText("No one follows this building yet"),
    ).toBeInTheDocument()
  })

  it("renders a single-follower message", () => {
    render(
      <BuildingFollowersSocialProofText
        followers={[follower("Alex", "user-1")]}
        total={1}
      />,
    )

    expect(screen.getByText("Alex")).toBeInTheDocument()
    expect(screen.getByText(/follows this building/)).toBeInTheDocument()
  })

  it("highlights the primary follower and verified badge for multi-follower copy", () => {
    render(
      <BuildingFollowersSocialProofText
        followers={[follower("Alex", "user-1", true)]}
        total={48}
      />,
    )

    expect(screen.getByText("Alex")).toHaveClass("font-semibold")
    expect(screen.getByLabelText("Verified follower")).toBeInTheDocument()
    expect(screen.getByText(/and 47 others follow this building/)).toBeInTheDocument()
  })

  it("normalizes invalid totals defensively", () => {
    render(
      <BuildingFollowersSocialProofText
        followers={[follower("Alex", "user-1")]}
        total={-3}
      />,
    )

    expect(
      screen.getByText("No one follows this building yet"),
    ).toBeInTheDocument()
  })

  it("falls back to a stable follower label when user data is missing", () => {
    render(
      <BuildingFollowersSocialProofText
        followers={[
          {
            _id: "follow-1",
            userId: "user-1",
            buildingId: "building-1",
            createdAt: undefined,
            updatedAt: undefined,
            user: null,
          },
        ]}
        total={2}
      />,
    )

    expect(screen.getByText("User user-1")).toBeInTheDocument()
    expect(screen.getByText(/and 1 other follow this building/)).toBeInTheDocument()
  })
})
