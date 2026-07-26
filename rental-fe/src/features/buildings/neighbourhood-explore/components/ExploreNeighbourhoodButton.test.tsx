import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ExploreNeighbourhoodButton } from "./ExploreNeighbourhoodButton"

describe("ExploreNeighbourhoodButton", () => {
  it("renders the pill variant by default", () => {
    render(<ExploreNeighbourhoodButton onClick={vi.fn()} />)

    expect(
      screen.getByRole("button", { name: "Explore neighbourhood" }),
    ).toHaveTextContent("Explore")
  })

  it("renders the footer icon variant", () => {
    render(
      <ExploreNeighbourhoodButton variant="footer" onClick={vi.fn()} />,
    )

    const button = screen.getByRole("button", {
      name: "Explore neighbourhood",
    })

    expect(button).toHaveClass("size-10")
    expect(button).not.toHaveTextContent("Explore")
  })

  it("passes the trigger element to onClick", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<ExploreNeighbourhoodButton variant="footer" onClick={onClick} />)

    await user.click(
      screen.getByRole("button", { name: "Explore neighbourhood" }),
    )

    expect(onClick).toHaveBeenCalledOnce()
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement)
  })
})
