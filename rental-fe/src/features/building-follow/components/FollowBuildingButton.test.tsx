import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FollowBuildingButton } from "./FollowBuildingButton"

describe("FollowBuildingButton", () => {
  it("calls onClick when enabled", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<FollowBuildingButton isFollowing={false} onClick={onClick} />)

    await user.click(
      screen.getByRole("button", { name: "Follow building" }),
    )

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("marks the button busy while pending", () => {
    render(
      <FollowBuildingButton isFollowing={false} isPending onClick={vi.fn()} />,
    )

    expect(
      screen.getByRole("button", { name: "Follow building" }),
    ).toHaveAttribute("aria-busy", "true")
  })

  it("reflects the following state in aria-pressed", () => {
    render(<FollowBuildingButton isFollowing onClick={vi.fn()} />)

    expect(
      screen.getByRole("button", { name: "Unfollow building" }),
    ).toHaveAttribute("aria-pressed", "true")
  })
})
