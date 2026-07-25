import { http, HttpResponse } from "msw"
import { screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setAccessToken, clearAccessToken } from "@/lib/api-client"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { ListerReviewsSection } from "./ListerReviewsSection"

const authUser = {
  _id: "viewer-1",
  name: "Viewer",
  email: "viewer@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE" as const,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

const mocks = vi.hoisted(() => ({
  myAgentProfile: null as { _id: string } | null,
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    userId: authUser._id,
    isAuthenticated: true,
    isLoading: false,
    isFetching: false,
    isUnauthorized: false,
    refetchUser: vi.fn(),
  }),
}))

vi.mock("@/features/profile/api/useMyAgentProfile", () => ({
  useMyAgentProfile: () => ({
    data: mocks.myAgentProfile,
    isMissing: !mocks.myAgentProfile,
    isLoading: false,
    isSuccess: true,
  }),
}))

function reviewsHandler() {
  return http.get("/api/v1/lister-reviews/listers/:listerProfileId", () =>
    HttpResponse.json({
      success: true,
      data: {
        myReview: null,
        reviews: [],
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    }),
  )
}

describe("ListerReviewsSection create review affordance", () => {
  beforeEach(() => {
    setAccessToken("viewer-token")
    mocks.myAgentProfile = null
    server.use(reviewsHandler())
  })

  afterEach(() => {
    clearAccessToken()
  })

  it("shows Write review when logged in even if lister userId is hidden", async () => {
    renderWithProviders(
      <ListerReviewsSection
        listerProfileId="lister-profile-1"
        listerUserId={null}
      />,
    )

    expect(
      await screen.findByRole("button", { name: "Write review" }),
    ).toBeInTheDocument()
  })

  it("hides Write review on the viewer's own public profile", async () => {
    mocks.myAgentProfile = { _id: "lister-profile-1" }

    renderWithProviders(
      <ListerReviewsSection
        listerProfileId="lister-profile-1"
        listerUserId={null}
      />,
    )

    await screen.findByText("No reviews yet.")

    expect(
      screen.queryByRole("button", { name: "Write review" }),
    ).not.toBeInTheDocument()
  })
})
