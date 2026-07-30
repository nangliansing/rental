import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"
import { createListerProfileResponse } from "@/test/fixtures/listerProfile"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { ListerProfilePage } from "./ListerProfilePage"

vi.mock("@/features/lister-review/components", () => ({
  ListerReviewsSection: () => <div>Reviews panel</div>,
}))

vi.mock("../components/ListerProfileListings", () => ({
  ListerProfileListings: () => <div>Listings panel</div>,
}))

function renderListerProfilePage(agentProfileId = "agent-1") {
  return renderWithProviders(
    <Routes>
      <Route path="/listers/:agentProfileId" element={<ListerProfilePage />} />
    </Routes>,
    { initialEntries: [`/listers/${agentProfileId}`] },
  )
}

function listerProfileHandler(
  response: unknown = createListerProfileResponse(),
) {
  return http.get("/api/v1/search/agents/:agentProfileId", () =>
    HttpResponse.json(response),
  )
}

function listerListingsHandler() {
  const listing = {
    ...createSearchListing(),
    building: createSearchBuilding(),
  }

  return http.get("/api/v1/search/agents/:agentProfileId/listings", () =>
    HttpResponse.json({
      success: true,
      data: {
        agentProfile: {
          _id: "agent-1",
          displayName: "Nang Lian Sing",
          isOnline: true,
          isVerified: true,
          createdAt: "2026-07-20T00:00:00.000Z",
        },
        listings: [listing],
      },
      pagination: {
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      },
    }),
  )
}

describe("ListerProfilePage", () => {
  it("loads profile header and listings grid", async () => {
    server.use(listerProfileHandler(), listerListingsHandler())

    renderListerProfilePage()

    expect(await screen.findByText("Nang Lian Sing")).toBeInTheDocument()
    expect(await screen.findByText("Listings panel")).toBeInTheDocument()
  })

  it("shows not found for missing profiles", async () => {
    server.use(
      http.get("/api/v1/search/agents/:agentProfileId", () =>
        HttpResponse.json(
          { success: false, code: "AGENT_PROFILE_NOT_FOUND" },
          { status: 404 },
        ),
      ),
    )

    renderListerProfilePage("missing-agent")

    expect(
      await screen.findByRole("heading", { name: "Lister not found" }),
    ).toBeInTheDocument()
  })

  it("shows retry UI for transient profile errors", async () => {
    let attempts = 0

    server.use(
      http.get("/api/v1/search/agents/:agentProfileId", () => {
        attempts += 1

        if (attempts === 1) {
          return HttpResponse.json(
            { success: false, message: "Server error" },
            { status: 500 },
          )
        }

        return HttpResponse.json(createListerProfileResponse())
      }),
      listerListingsHandler(),
    )

    const { user } = renderListerProfilePage()

    expect(
      await screen.findByRole("heading", { name: "Could not load lister" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try again" }))

    expect(await screen.findByText("Nang Lian Sing")).toBeInTheDocument()
  })

  it("switches listing filter tabs and refetches with the selected filter", async () => {
    const requestedUrls: string[] = []

    server.use(
      listerProfileHandler(),
      http.get("/api/v1/search/agents/:agentProfileId/listings", ({ request }) => {
        requestedUrls.push(new URL(request.url).search)

        return HttpResponse.json({
          success: true,
          data: {
            agentProfile: { _id: "agent-1", displayName: "Nang Lian Sing" },
            listings: [],
          },
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        })
      }),
    )

    const { user } = renderListerProfilePage()

    await screen.findByText("Nang Lian Sing")
    await waitFor(() => {
      expect(requestedUrls.some((query) => query.includes("filter=all"))).toBe(true)
    })

    requestedUrls.length = 0
    await user.click(screen.getByRole("tab", { name: "Now" }))

    await waitFor(() => {
      expect(requestedUrls.some((query) => query.includes("filter=now"))).toBe(true)
    })

    await user.click(screen.getByRole("tab", { name: "Soon" }))

    await waitFor(() => {
      expect(requestedUrls.some((query) => query.includes("filter=soon"))).toBe(true)
    })
    expect(screen.getByText("Soonest first")).toBeInTheDocument()
    expect(document.getElementById("lister-profile-listing-sort")).toBeNull()
  })

  it("switches to reviews without requiring listings on that tab", async () => {
    const listingsSpy = vi.fn()

    server.use(
      listerProfileHandler(),
      http.get("/api/v1/search/agents/:agentProfileId/listings", () => {
        listingsSpy()

        return HttpResponse.json({
          success: true,
          data: { agentProfile: { _id: "agent-1" }, listings: [] },
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        })
      }),
    )

    const { user } = renderListerProfilePage()

    await screen.findByText("Nang Lian Sing")
    listingsSpy.mockClear()

    await user.click(screen.getByRole("tab", { name: "Reviews" }))

    expect(await screen.findByText("Reviews panel")).toBeInTheDocument()

    await waitFor(() => {
      expect(listingsSpy).not.toHaveBeenCalled()
    })
  })
})
