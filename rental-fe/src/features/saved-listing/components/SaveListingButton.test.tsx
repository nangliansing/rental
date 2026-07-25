import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SaveListingButton } from "./SaveListingButton"

describe("SaveListingButton", () => {
  it("exposes saved state and forwards an enabled action", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<SaveListingButton isSaved onClick={onClick} />)

    const button = screen.getByRole("button", {
      name: "Remove saved listing",
    })
    expect(button).toHaveAttribute("aria-pressed", "true")
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("accepts repeated actions while the latest state is syncing", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <SaveListingButton isSaved={false} isPending onClick={onClick} />,
    )

    const button = screen.getByRole("button", { name: "Save listing" })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button).toHaveTextContent("")
    await user.click(button)
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it("keeps its accessible name without rendering a visible label", () => {
    render(<SaveListingButton isSaved={false} onClick={vi.fn()} />)

    const button = screen.getByRole("button", { name: "Save listing" })
    expect(button).toHaveTextContent("")
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })
})
