import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ActiveToggleCircleButton } from "./ActiveToggleCircleButton"

describe("ActiveToggleCircleButton", () => {
  it("calls onClick when enabled", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={onClick}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Follow building" }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("does not call onClick while pending or disabled", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    const { rerender } = render(
      <ActiveToggleCircleButton
        isActive={false}
        isPending
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={onClick}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Follow building" }))
    expect(onClick).not.toHaveBeenCalled()

    rerender(
      <ActiveToggleCircleButton
        isActive={false}
        isDisabled
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={onClick}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Follow building" }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it("marks the button busy while pending", () => {
    render(
      <ActiveToggleCircleButton
        isActive={false}
        isPending
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Follow building" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("reflects the active state in aria-pressed and labels", () => {
    const { rerender } = render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Follow building" }),
    ).toHaveAttribute("aria-pressed", "false")

    rerender(
      <ActiveToggleCircleButton
        isActive
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow building" }),
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("renders icon-only content with decorative icons hidden from assistive tech", () => {
    render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: "Follow building" })
    expect(button).toHaveTextContent("")
    expect(button.querySelector('[aria-hidden="true"] svg')).toBeTruthy()
  })

  it("uses the compact default size", () => {
    render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Follow building" })).toHaveClass(
      "size-5",
    )
  })

  it.each([
    ["sm", "size-7"],
    ["md", "size-8"],
    ["lg", "size-9"],
  ] as const)("supports the %s size variant", (size, expectedClass) => {
    render(
      <ActiveToggleCircleButton
        isActive={false}
        size={size}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Follow building" })).toHaveClass(
      expectedClass,
    )
  })

  it("shows inactive and active surfaces without a border", () => {
    const { rerender } = render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Follow building" })).toHaveClass(
      "bg-red-500",
      "border-0",
    )

    rerender(
      <ActiveToggleCircleButton
        isActive
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Unfollow building" })).toHaveClass(
      "bg-white",
      "border-0",
    )
  })

  it("uses neutral gray shadows for both states", () => {
    const { rerender } = render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Follow building" }).className).toContain(
      "rgba(15,23,42,0.2)",
    )

    rerender(
      <ActiveToggleCircleButton
        isActive
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow building" }).className,
    ).toContain("rgba(15,23,42,0.16)")
  })

  it("shows the plus icon when inactive and the check icon when active", () => {
    const { rerender, container } = render(
      <ActiveToggleCircleButton
        isActive={false}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    const icons = container.querySelectorAll("svg")
    expect(icons).toHaveLength(2)
    expect(icons[0]).toHaveClass("opacity-100")
    expect(icons[1]).toHaveClass("opacity-0")

    rerender(
      <ActiveToggleCircleButton
        isActive
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    const activeIcons = container.querySelectorAll("svg")
    expect(activeIcons[0]).toHaveClass("opacity-0")
    expect(activeIcons[1]).toHaveClass("opacity-100")
  })

  it("applies the pending animation while loading", () => {
    render(
      <ActiveToggleCircleButton
        isActive={false}
        isPending
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelector(".active-toggle-pending")).not.toBeNull()
    expect(document.querySelector(".active-toggle-settle")).toBeNull()
  })

  it("applies the settle animation after settleSignal changes", () => {
    const { rerender } = render(
      <ActiveToggleCircleButton
        isActive
        settleSignal={0}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelector(".active-toggle-settle")).toBeNull()

    rerender(
      <ActiveToggleCircleButton
        isActive
        settleSignal={1}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelector(".active-toggle-settle")).not.toBeNull()
  })

  it("does not apply settle animation while still pending", () => {
    render(
      <ActiveToggleCircleButton
        isActive
        isPending
        settleSignal={2}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelector(".active-toggle-pending")).not.toBeNull()
    expect(document.querySelector(".active-toggle-settle")).toBeNull()
  })

  it("does not retrigger settle animation for the same settleSignal", () => {
    const { rerender } = render(
      <ActiveToggleCircleButton
        isActive
        settleSignal={0}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    rerender(
      <ActiveToggleCircleButton
        isActive
        settleSignal={1}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelector(".active-toggle-settle")).not.toBeNull()

    rerender(
      <ActiveToggleCircleButton
        isActive
        settleSignal={1}
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(document.querySelectorAll(".active-toggle-settle")).toHaveLength(1)
  })

  it("merges custom className overrides", () => {
    render(
      <ActiveToggleCircleButton
        isActive={false}
        className="custom-toggle"
        inactiveLabel="Follow building"
        activeLabel="Unfollow building"
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Follow building" })).toHaveClass(
      "custom-toggle",
    )
  })
})
