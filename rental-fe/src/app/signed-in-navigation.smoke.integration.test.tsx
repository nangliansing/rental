import type { ReactElement } from "react"
import { http, HttpResponse } from "msw"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StandalonePageLayout } from "@/app/StandalonePageLayout"
import { ListingCreatePage } from "@/features/listing/pages/ListingCreatePage"
import { ProfileEditPage } from "@/features/profile/pages/ProfileEditPage"
import { ProfilePage } from "@/features/profile/pages/ProfilePage"
import { AppNavigation } from "@/shared/components/navigation/AppNavigation"
import { StandalonePageBackProvider } from "@/shared/components/navigation/StandalonePageBackContext"
import { StandalonePageHeader } from "@/shared/components/navigation/StandalonePageHeader"
import { clearAccessToken, setAccessToken } from "@/lib/api-client"
import { createListerProfile } from "@/test/fixtures/listerProfile"
import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

const authUser = {
  _id: "user-smoke-1",
  name: "Nang Lian Sing",
  email: "nang.smoke@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE" as const,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

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

vi.mock("@/features/listing/components/ListingForm", () => ({
  ListingForm: () => <div>Listing form</div>,
}))

vi.mock("@/features/listing/components/BuildingForm", () => ({
  BuildingForm: ({
    onSubmit,
    defaultValues,
  }: {
    onSubmit: (values: Record<string, unknown>) => void
    defaultValues?: { name?: string }
  }) => (
    <div>
      <label htmlFor="building-name">Building name</label>
      <input
        id="building-name"
        aria-label="Building name"
        readOnly
        value={defaultValues?.name ?? ""}
      />
      <button
        type="button"
        onClick={() =>
          onSubmit({
            name: "Smoke Draft Residence",
            buildingType: "Apartment",
            address: "Smoke address",
            facilities: ["Parking"],
            security: ["CCTV"],
          })
        }
      >
        Continue to listing
      </button>
    </div>
  ),
}))

vi.mock("@/features/notifications", () => ({
  NotificationBellButton: () => (
    <button type="button" aria-label="Notifications">
      Notifications
    </button>
  ),
}))

vi.mock("@/features/user-menu", () => ({
  UserMenuButton: () => (
    <button type="button" aria-label="Account menu">
      Account
    </button>
  ),
}))

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => true,
}))

function installSignedInHandlers() {
  server.use(
    http.get("/api/v1/agent-profiles/me", () =>
      HttpResponse.json({
        success: true,
        data: createListerProfile(),
      }),
    ),
    http.get("/api/v1/saved-listings", () =>
      HttpResponse.json({
        success: true,
        data: {
          savedListings: [
            {
              _id: "saved-1",
              listingId: "listing-1",
              buildingId: "building-1",
              listedBy: authUser._id,
              listing: {
                ...createSearchListing(),
                building: createSearchBuilding(),
              },
              createdAt: "2026-07-20T00:00:00.000Z",
              updatedAt: "2026-07-21T00:00:00.000Z",
            },
          ],
        },
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      }),
    ),
    http.get("/api/v1/listings", () =>
      HttpResponse.json({
        success: true,
        data: { listings: [createSearchListing()] },
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      }),
    ),
    http.get("/api/v1/pending-posts", () =>
      HttpResponse.json({
        success: true,
        data: { pendingPosts: [] },
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
      }),
    ),
    http.get("/api/v1/lister-reviews/listers/:listerProfileId", () =>
      HttpResponse.json({
        success: true,
        data: { reviews: [] },
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
      }),
    ),
  )
}

function renderSignedInApp(ui: ReactElement, initialEntries = ["/profile"]) {
  return renderWithProviders(ui, { initialEntries })
}

describe("Signed-in navigation smoke (integration)", () => {
  beforeEach(() => {
    setAccessToken("signed-in-smoke-access-token")
    installSignedInHandlers()
  })

  afterEach(() => {
    clearAccessToken()
  })

  it("loads the profile dashboard with tabs and saved nav affordance", async () => {
    renderSignedInApp(
      <>
        <ProfilePage />
        <AppNavigation />
      </>,
    )

    expect(
      await screen.findByRole("heading", { name: "Nang Lian Sing" }),
    ).toBeInTheDocument()

    const profileSections = screen.getByRole("tablist", {
      name: "Profile sections",
    })
    expect(
      within(profileSections).queryByRole("tab", { name: "Saved" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: "Saved listings" }).length,
    ).toBeGreaterThan(0)
  })

  it("loads profile edit behind the standalone header", async () => {
    renderSignedInApp(
      <Routes>
        <Route path="/" element={<StandalonePageLayout />}>
          <Route path="profile/edit" element={<ProfileEditPage />} />
        </Route>
      </Routes>,
      ["/profile/edit"],
    )

    expect(await screen.findByRole("button", { name: "Go back" })).toBeInTheDocument()
    expect(
      await screen.findByRole("heading", { name: "Edit contact profile" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Search rentals" })).toHaveAttribute(
      "href",
      "/",
    )
  })

  it("returns to profile when using back from profile edit", async () => {
    const user = userEvent.setup()

    renderSignedInApp(
      <Routes>
        <Route
          path="/profile"
          element={
            <>
              <ProfilePage />
              <AppNavigation />
            </>
          }
        />
        <Route path="/" element={<StandalonePageLayout />}>
          <Route path="profile/edit" element={<ProfileEditPage />} />
        </Route>
      </Routes>,
      ["/profile"],
    )

    expect(
      await screen.findByRole("heading", { name: "Nang Lian Sing" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Edit profile" }))

    expect(
      await screen.findByRole("heading", { name: "Edit contact profile" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(
      await screen.findByRole("heading", { name: "Nang Lian Sing" }),
    ).toBeInTheDocument()
  })

  it("returns create listing from step 2 to step 1 via the shared back button", async () => {
    const user = userEvent.setup()

    renderSignedInApp(
      <StandalonePageBackProvider>
        <StandalonePageHeader />
        <ListingCreatePage />
      </StandalonePageBackProvider>,
      ["/listings/new?lat=13.7&lng=100.5"],
    )

    expect(
      await screen.findByRole("heading", { name: "Building details" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Continue to listing" }),
    )

    expect(
      await screen.findByRole("heading", { name: "Room details" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(
      await screen.findByRole("heading", { name: "Building details" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/building name/i)).toHaveValue(
      "Smoke Draft Residence",
    )
  })

  it("opens and closes the saved listings drawer from mobile nav", async () => {
    const user = userEvent.setup()

    renderSignedInApp(<AppNavigation />)

    const [savedButton] = await screen.findAllByRole("button", {
      name: "Saved listings",
    })
    await user.click(savedButton)

    expect(
      await screen.findByRole("heading", { name: "Saved" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close saved listings" }))

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Saved" }),
      ).not.toBeInTheDocument()
    })
  })
})
