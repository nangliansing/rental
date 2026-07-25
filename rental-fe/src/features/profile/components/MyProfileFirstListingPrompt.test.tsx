import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { MyProfileFirstListingPrompt } from "./MyProfileFirstListingPrompt"

describe("MyProfileFirstListingPrompt", () => {
  it("links new listers to map list mode", () => {
    render(
      <MemoryRouter>
        <MyProfileFirstListingPrompt />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", { name: "List your first room" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Start listing" })).toHaveAttribute(
      "href",
      "/?purpose=list",
    )
  })
})
