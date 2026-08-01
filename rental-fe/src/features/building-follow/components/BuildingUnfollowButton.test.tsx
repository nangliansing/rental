import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BuildingUnfollowButton } from "./BuildingUnfollowButton"

describe("BuildingUnfollowButton", () => {
  it("calls onClick with an accessible label", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <BuildingUnfollowButton subjectLabel="Baron Zotel Bangkok" onClick={onClick} />,
    )

    await user.click(screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not call onClick while unfollow is pending", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <BuildingUnfollowButton
        subjectLabel="Baron Zotel Bangkok"
        isUnfollowing
        onClick={onClick}
      />,
    )

    const button = screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("shows a loader while unfollow is pending", () => {
    render(
      <BuildingUnfollowButton
        subjectLabel="Baron Zotel Bangkok"
        isUnfollowing
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" }).querySelector(
        "svg",
      ),
    ).toHaveClass("animate-spin")
  })

  it("stops event propagation when clicked", async () => {
    const user = userEvent.setup()
    const parentClick = vi.fn()

    render(
      <div onClick={parentClick}>
        <BuildingUnfollowButton
          subjectLabel="Baron Zotel Bangkok"
          onClick={vi.fn()}
        />
      </div>,
    )

    await user.click(screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" }))

    expect(parentClick).not.toHaveBeenCalled()
  })
})
