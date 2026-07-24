import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ListingPostCard } from "@/features/listing/components/ListingPostCard"
import { MyProfileSavedPanel } from "@/features/profile/components/MyProfileSavedPanel"
import { clearAccessToken, setAccessToken } from "@/lib/api-client"
import { AppNavigation } from "@/shared/components/navigation/AppNavigation"
import {
  createSearchBuilding,
  createSearchListing,
  listingPhoto,
} from "@/test/fixtures/listings"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import type { SearchSavedListing } from "../api"

const authUser = {
  _id: "user-1",
  name: "Nang Lian Sing",
  email: "user@example.com",
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

vi.mock("@/features/notifications", () => ({
  NotificationBellButton: () => (
    <button type="button" aria-label="Notifications">
      Notifications
    </button>
  ),
}))

vi.mock("@/features/auth/components/LogoutButton", () => ({
  LogoutButton: () => (
    <button type="button" aria-label="Log out">
      Log out
    </button>
  ),
}))

function createSavedListingResponse(
  overrides: Partial<SearchSavedListing> = {},
): SearchSavedListing {
  return {
    _id: "saved-listing-1",
    listingId: "listing-1",
    buildingId: "building-1",
    listedBy: "user-1",
    snapshot: {
      rent: 14000,
      visibility: "PUBLIC",
      buildingName: "Bangkapi Residence",
      coverPhoto: listingPhoto,
    },
    listing: {
      ...createSearchListing(),
      building: createSearchBuilding(),
    },
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  }
}

function savedListingsHandler(getSavedListings: () => SearchSavedListing[]) {
  return http.get("/api/v1/saved-listings", () => {
    const savedListings = getSavedListings()

    return HttpResponse.json({
      success: true,
      data: { savedListings },
      pagination: {
        page: 1,
        limit: 12,
        total: savedListings.length,
        totalPages: 1,
      },
    })
  })
}

describe("Saved listings authenticated smoke (integration)", () => {
  beforeEach(() => {
    setAccessToken("authenticated-access-token")
  })

  afterEach(() => {
    clearAccessToken()
  })

  it("opens the nav saved drawer, shows saved rooms, and closes cleanly", async () => {
    const user = userEvent.setup()
    server.use(savedListingsHandler(() => [createSavedListingResponse()]))

    renderWithProviders(<AppNavigation />)

    await clickSavedListingsNavButton(user)

    expect(
      await screen.findByRole("heading", { name: "Saved" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Rooms you want to revisit"),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("button", {
        name: "Open saved listing ฿14k",
      }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Close saved listings" }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Saved" }),
      ).not.toBeInTheDocument()
    })
  })

  it("calls delete when unsaving from the saved drawer panel", async () => {
    const user = userEvent.setup()
    const deleteSpy = vi.fn()

    server.use(
      savedListingsHandler(() => [createSavedListingResponse()]),
      http.delete("/api/v1/saved-listings/:listingId", () => {
        deleteSpy()

        return HttpResponse.json({
          success: true,
          data: createSavedListingResponse(),
        })
      }),
      http.get("/api/v1/agent-profiles/me", () =>
        HttpResponse.json({ success: false }, { status: 404 }),
      ),
    )

    const { SavedListingsPanel } = await import("./SavedListingsPanel")

    renderWithProviders(<SavedListingsPanel layout="drawer" enabled />)

    await user.click(
      await screen.findByRole("button", { name: "Remove saved listing" }),
    )

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledOnce())
  })

  it("loads saved rooms on the profile Saved tab", async () => {
    server.use(savedListingsHandler(() => [createSavedListingResponse()]))

    renderWithProviders(<MyProfileSavedPanel />)

    expect(
      await screen.findByRole("button", {
        name: "Open saved listing ฿14k",
      }),
    ).toBeInTheDocument()
  })

  it("shows save affordance on listing cards when signed in", () => {
    const listing = {
      ...createSearchListing(),
      isSavedByMe: false,
      agentProfile: {
        _id: "agent-1",
        displayName: "Nang Lian Sing",
        phone: "0812345678",
        lineUrl: null,
        whatsappPhone: null,
        telegramUrl: null,
        viberPhone: null,
      },
    }

    renderWithProviders(
      <ListingPostCard listing={listing} currentUserId="other-user" />,
    )

    expect(
      screen.getByRole("button", { name: "Save listing" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Phone" })).toBeInTheDocument()
  })

  it("shows Copied feedback after confirming phone contact", async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined)

    const listing = {
      ...createSearchListing(),
      isSavedByMe: false,
      agentProfile: {
        _id: "agent-1",
        displayName: "Nang Lian Sing",
        phone: "0812345678",
        lineUrl: null,
        whatsappPhone: null,
        telegramUrl: null,
        viberPhone: null,
      },
    }

    renderWithProviders(
      <ListingPostCard listing={listing} currentUserId="other-user" />,
    )

    await user.click(screen.getByRole("button", { name: "Phone" }))
    await user.click(screen.getByRole("button", { name: "Copy Phone" }))

    expect(await screen.findByText("Copied")).toBeInTheDocument()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("0812345678")
  })
})

function clickSavedListingsNavButton(user: ReturnType<typeof userEvent.setup>) {
  const [savedButton] = screen.getAllByRole("button", {
    name: "Saved listings",
  })

  return user.click(savedButton)
}
