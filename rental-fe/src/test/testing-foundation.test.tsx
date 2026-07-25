import { useQuery } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { Link, useLocation } from "react-router-dom"
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

import { renderWithProviders } from "./renderWithProviders"
import { server } from "./server"

function FoundationProbe() {
  const location = useLocation()
  const message = useQuery({
    queryKey: ["testing-foundation"],
    queryFn: async () => {
      const response = await fetch("/api/v1/testing-foundation")

      if (!response.ok) throw new Error("Request failed")

      const body = (await response.json()) as { message: string }
      return body.message
    },
  })

  return (
    <main>
      <p>{message.data ?? "Loading"}</p>
      <p>Path: {location.pathname}</p>
      <Link to="/profile">Open profile</Link>
    </main>
  )
}

describe("testing foundation", () => {
  it("runs tests against production modules", () => {
    expect(cn("px-2", { hidden: false }, "px-4")).toBe("px-4")
  })

  it("supports mocked requests, React Query, routing, and user interaction", async () => {
    server.use(
      http.get("/api/v1/testing-foundation", () => {
        return HttpResponse.json({ message: "Foundation ready" })
      }),
    )

    const { user } = renderWithProviders(<FoundationProbe />)

    expect(await screen.findByText("Foundation ready")).toBeInTheDocument()
    expect(screen.getByText("Path: /")).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Open profile" }))

    expect(screen.getByText("Path: /profile")).toBeInTheDocument()
  })
})
