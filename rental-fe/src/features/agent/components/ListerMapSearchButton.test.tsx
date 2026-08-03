import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom"
import { describe, expect, it } from "vitest"

import { LISTER_MAP_SEARCH_LOCATION_STATE_KEY } from "@/features/agent/lister-map-search/navigationState"
import { PROFILE_ICON_BUTTON_CLASS } from "@/features/profile/utils/profileLayoutStyles"
import { listingPhoto } from "@/test/fixtures/listings"

import { ListerMapSearchButton } from "./ListerMapSearchButton"

import type { ListerMapSearchSeed } from "../lister-map-search/types"

const defaultLister: ListerMapSearchSeed = {
  _id: "agent-1",
  displayName: "Nang Lian Sing",
  profilePhoto: listingPhoto,
}

function renderButton({
  lister = defaultLister,
  activeListingCount = 2,
}: {
  lister?: ListerMapSearchSeed
  activeListingCount?: number
} = {}) {
  return render(
    <MemoryRouter>
      <ListerMapSearchButton
        lister={lister}
        activeListingCount={activeListingCount}
      />
    </MemoryRouter>,
  )
}

function LocationStateProbe() {
  const location = useLocation()

  return (
    <div data-testid="location-state">{JSON.stringify(location.state)}</div>
  )
}

function renderButtonWithNavigation({
  lister = defaultLister,
  activeListingCount = 2,
}: {
  lister?: ListerMapSearchSeed
  activeListingCount?: number
} = {}) {
  const router = createMemoryRouter(
    [
      {
        path: "/profile",
        element: (
          <ListerMapSearchButton
            lister={lister}
            activeListingCount={activeListingCount}
          />
        ),
      },
      {
        path: "/",
        element: <LocationStateProbe />,
      },
    ],
    { initialEntries: ["/profile"] },
  )

  return render(<RouterProvider router={router} />)
}

function queryMapSearchLink(name?: string | RegExp) {
  return name
    ? screen.queryByRole("link", { name })
    : screen.queryByRole("link", { name: /listings on map/i })
}

describe("ListerMapSearchButton", () => {
  it("links to map search with the lister filter applied", () => {
    renderButton()

    const link = screen.getByRole("link", {
      name: "Search Nang Lian Sing's listings on map",
    })
    const href = link.getAttribute("href")

    expect(href).toContain("agent-1")
    expect(href).toContain("filters=")
    expect(link.className).toBe(PROFILE_ICON_BUTTON_CLASS)
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  })

  it("navigates with the lister seed in router location state", async () => {
    const user = userEvent.setup()

    renderButtonWithNavigation()

    await user.click(
      screen.getByRole("link", {
        name: "Search Nang Lian Sing's listings on map",
      }),
    )

    expect(JSON.parse(screen.getByTestId("location-state").textContent!)).toEqual(
      {
        [LISTER_MAP_SEARCH_LOCATION_STATE_KEY]: {
          _id: "agent-1",
          displayName: "Nang Lian Sing",
          profilePhoto: listingPhoto,
        },
      },
    )
  })

  it("uses the fallback lister label when displayName is missing", () => {
    renderButton({
      lister: {
        _id: "agent-1",
        displayName: null,
        profilePhoto: null,
      },
    })

    expect(
      queryMapSearchLink("Search Lister's listings on map"),
    ).not.toBeNull()
  })

  it("uses the fallback lister label when displayName is blank", () => {
    renderButton({
      lister: {
        _id: "agent-1",
        displayName: "   ",
        profilePhoto: null,
      },
    })

    expect(
      queryMapSearchLink("Search Lister's listings on map"),
    ).not.toBeNull()
  })

  it("does not render when there are no active listings", () => {
    renderButton({ activeListingCount: 0 })

    expect(queryMapSearchLink()).toBeNull()
  })

  it("does not render when the active listing count is negative", () => {
    renderButton({ activeListingCount: -1 })

    expect(queryMapSearchLink()).toBeNull()
  })

  it("does not render when the lister id is blank", () => {
    renderButton({
      lister: {
        _id: "   ",
        displayName: "Nang Lian Sing",
        profilePhoto: null,
      },
    })

    expect(queryMapSearchLink()).toBeNull()
  })

  it("trims the lister id before building the map search URL", () => {
    renderButton({
      lister: {
        _id: "  agent-42  ",
        displayName: "Nang",
        profilePhoto: null,
      },
    })

    const href = screen
      .getByRole("link", { name: "Search Nang's listings on map" })
      .getAttribute("href")

    expect(href).toContain("agent-42")
    expect(href).not.toContain("  agent-42  ")
  })

  it("renders when there is exactly one active listing", () => {
    renderButton({ activeListingCount: 1 })

    expect(
      queryMapSearchLink("Search Nang Lian Sing's listings on map"),
    ).not.toBeNull()
  })
})
