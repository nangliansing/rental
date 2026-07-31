import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FollowBuildingButton } from "./FollowBuildingButton"

describe("FollowBuildingButton", () => {
  it("forwards click handling with building-specific labels", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<FollowBuildingButton isFollowing={false} onClick={onClick} />)

    await user.click(
      screen.getByRole("button", { name: "Follow building" }),
    )

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("maps following state to the shared active toggle button", () => {
    const { rerender } = render(
      <FollowBuildingButton isFollowing={false} onClick={vi.fn()} />,
    )

    expect(
      screen.getByRole("button", { name: "Follow building" }),
    ).toHaveAttribute("aria-pressed", "false")

    rerender(<FollowBuildingButton isFollowing onClick={vi.fn()} />)

    expect(
      screen.getByRole("button", { name: "Unfollow building" }),
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("marks the button busy while pending", () => {
    render(
      <FollowBuildingButton isFollowing={false} isPending onClick={vi.fn()} />,
    )

    expect(
      screen.getByRole("button", { name: "Follow building" }),
    ).toHaveAttribute("aria-busy", "true")
  })

  it("forwards disabled state without blocking settle animation on increment", () => {
    const { rerender } = render(
      <FollowBuildingButton
        isFollowing
        isDisabled
        settleSignal={0}
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow building" }),
    ).toBeDisabled()
    expect(document.querySelector(".active-toggle-settle")).toBeNull()

    rerender(
      <FollowBuildingButton
        isFollowing
        isDisabled
        settleSignal={1}
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelector(".active-toggle-settle")).not.toBeNull()
  })
})
