import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { RouteErrorPage } from "./RouteErrorPage"

function ThrowingRoute() {
  throw new Error("Something broke in the route")
}

describe("RouteErrorPage", () => {
  it("shows a friendly message and developer trace output", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          errorElement: <RouteErrorPage />,
          element: <ThrowingRoute />,
        },
      ],
      { initialEntries: ["/"] },
    )

    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Something unexpected happened while loading this page. You can try again or return home.",
      ),
    ).toBeInTheDocument()

    const details = screen.getByText("Technical details").closest("details")
    expect(details).not.toBeNull()

    const panel = within(details as HTMLElement)
    expect(panel.getByText("error.log")).toBeInTheDocument()
    expect(panel.getByText("Error: Something broke in the route")).toBeInTheDocument()
  })

  it("reloads when try again is clicked", async () => {
    const reload = vi.fn()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    })

    const router = createMemoryRouter(
      [
        {
          path: "/",
          errorElement: <RouteErrorPage />,
          element: <ThrowingRoute />,
        },
      ],
      { initialEntries: ["/"] },
    )

    render(<RouterProvider router={router} />)

    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
