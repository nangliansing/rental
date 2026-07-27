import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ModalDismissHeader } from "./ModalDismissHeader"

describe("ModalDismissHeader", () => {
  it("calls onClose from both dismiss controls", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<ModalDismissHeader onClose={onClose} closeLabel="Close listing details" />)

    const closeButtons = screen.getAllByRole("button", {
      name: "Close listing details",
    })

    expect(closeButtons).toHaveLength(2)

    await user.click(closeButtons[0])
    await user.click(closeButtons[1])

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("renders an inline title row with trailing actions", () => {
    render(
      <ModalDismissHeader
        onClose={vi.fn()}
        closeLabel="Close explore neighbourhood"
        title="Explore neighbourhood"
        description="What's nearby this building"
        trailing={<button type="button">500 m</button>}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Explore neighbourhood" }),
    ).toBeInTheDocument()
    expect(screen.getByText("What's nearby this building")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "500 m" })).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: "Close explore neighbourhood" }),
    ).toHaveLength(2)
  })
})
