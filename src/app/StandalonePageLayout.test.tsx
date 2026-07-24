import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { StandalonePageLayout } from "./StandalonePageLayout"

function TestChild() {
  return <div>Page content</div>
}

describe("StandalonePageLayout", () => {
  it("renders shared navigation header on standalone routes", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<StandalonePageLayout />}>
            <Route path="/login" element={<TestChild />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/",
    )
    expect(screen.getByRole("link", { name: "Go to profile" })).toHaveAttribute(
      "href",
      "/profile",
    )
    expect(screen.getByText("Page content")).toBeInTheDocument()
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument()
  })
})
