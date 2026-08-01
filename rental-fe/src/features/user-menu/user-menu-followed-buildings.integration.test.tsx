import { QueryClient } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { readBuildingFollowingFromCache } from "@/features/building-follow/utils/buildingFollowCache"
import { queryKeys } from "@/lib/query-keys"
import { setAccessToken } from "@/lib/api-client"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { UserMenuFollowedBuildingsSection } from "./components/followed-buildings/UserMenuFollowedBuildingsSection"

const baronZotelId = "baron-zotel"

const baronZotelBuildingPayload = {
  _id: baronZotelId,
  name: "Baron Zotel Bangkok",
  buildingType: "Apartment",
  facilities: ["Gym"],
  security: ["CCTV"],
  location: {
    type: "Point",
    coordinates: [100.6435, 13.7654],
  },
  address: "Bangkok",
  minRent: 5500,
  maxRent: 8000,
}

const followingsResponse = {
  success: true,
  data: {
    followings: [
      {
        _id: "follow-1",
        buildingId: baronZotelId,
        createdAt: "2026-07-31T10:15:30.123Z",
        updatedAt: "2026-07-31T10:15:30.123Z",
        building: baronZotelBuildingPayload,
      },
      {
        _id: "follow-2",
        buildingId: "building-2",
        createdAt: "2026-07-30T10:15:30.123Z",
        updatedAt: "2026-07-30T10:15:30.123Z",
        building: {
          ...baronZotelBuildingPayload,
          _id: "building-2",
          name: "Search Filter Fixture",
          address: "Lat Phrao Road, Bang Kapi, Bangkok",
        },
      },
    ],
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
  },
}

function createIntegrationQueryClient() {
  // Keep seeded building detail/list caches alive while the followings query
  // is the only active observer (createTestQueryClient uses gcTime: 0).
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function seedFollowedBuildingDetail(queryClient: QueryClient) {
  queryClient.setQueryData(queryKeys.buildings.detail(baronZotelId), {
    ...baronZotelBuildingPayload,
    isFollowing: true,
  })
  queryClient.setQueryData(
    queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: baronZotelId,
      filters: {},
      limit: 20,
    }),
    {
      pages: [
        {
          data: {
            building: {
              ...baronZotelBuildingPayload,
              isFollowing: true,
            },
            listings: [],
          },
        },
      ],
      pageParams: [1],
    },
  )
}

function installFollowingsHandler() {
  server.use(
    http.get("/api/v1/building-follows/users/user-1", () =>
      HttpResponse.json(followingsResponse),
    ),
  )
}

describe("user menu followed buildings integration", () => {
  beforeEach(() => {
    setAccessToken("access-token")
  })

  it("loads followings without overwriting followed building state", async () => {
    installFollowingsHandler()
    const queryClient = createIntegrationQueryClient()
    seedFollowedBuildingDetail(queryClient)

    renderWithProviders(
      <UserMenuFollowedBuildingsSection userId="user-1" enabled />,
      { queryClient },
    )

    expect(await screen.findByText("Baron Zotel Bangkok")).toBeInTheDocument()
    expect(readBuildingFollowingFromCache(queryClient, baronZotelId)).toBe(true)
    expect(screen.getByText("Search Filter Fixture")).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: /Unfollow/i }),
    ).toHaveLength(2)

    await waitFor(() =>
      expect(readBuildingFollowingFromCache(queryClient, baronZotelId)).toBe(true),
    )

    const followingsKey = queryKeys.buildingFollows.list({
      userId: "user-1",
      limit: 20,
    })
    expect(
      queryClient.getQueryData<{
        pages: Array<{ data: { followings: Array<{ building?: unknown }> } }>
      }>(followingsKey)?.pages[0]?.data.followings[0]?.building,
    ).not.toHaveProperty("isFollowing")
  })

  it("unfollows a building from the account panel and updates caches", async () => {
    installFollowingsHandler()
    server.use(
      http.delete(`/api/v1/building-follows/${baronZotelId}`, () =>
        HttpResponse.json({
          success: true,
          data: {
            _id: "follow-1",
            userId: "user-1",
            buildingId: baronZotelId,
            createdAt: "2026-07-31T10:15:30.123Z",
            updatedAt: "2026-07-31T10:15:30.123Z",
          },
        }),
      ),
    )

    const queryClient = createIntegrationQueryClient()
    seedFollowedBuildingDetail(queryClient)

    const { user } = renderWithProviders(
      <UserMenuFollowedBuildingsSection userId="user-1" enabled />,
      { queryClient },
    )

    await screen.findByText("Baron Zotel Bangkok")

    await user.click(
      screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" }),
    )

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Unfollow Baron Zotel Bangkok" }),
      ).not.toBeInTheDocument(),
    )

    await waitFor(() =>
      expect(readBuildingFollowingFromCache(queryClient, baronZotelId)).toBe(
        false,
      ),
    )
    expect(queryClient.getQueryData(queryKeys.buildings.detail(baronZotelId))).toMatchObject(
      { isFollowing: false },
    )

    const followingsKey = queryKeys.buildingFollows.list({
      userId: "user-1",
      limit: 20,
    })
    expect(queryClient.getQueryData(followingsKey)).toMatchObject({
      pages: [
        {
          data: {
            followings: [expect.objectContaining({ buildingId: "building-2" })],
          },
          pagination: { total: 1 },
        },
      ],
    })
  })

  it("keeps the remaining row visible when unfollowing one building", async () => {
    installFollowingsHandler()
    server.use(
      http.delete(`/api/v1/building-follows/${baronZotelId}`, () =>
        HttpResponse.json({
          success: true,
          data: {
            _id: "follow-1",
            userId: "user-1",
            buildingId: baronZotelId,
            createdAt: "2026-07-31T10:15:30.123Z",
            updatedAt: "2026-07-31T10:15:30.123Z",
          },
        }),
      ),
    )

    const queryClient = createIntegrationQueryClient()
    seedFollowedBuildingDetail(queryClient)

    const { user } = renderWithProviders(
      <UserMenuFollowedBuildingsSection userId="user-1" enabled />,
      { queryClient },
    )

    await screen.findByText("Baron Zotel Bangkok")
    await user.click(
      screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" }),
    )

    expect(
      await screen.findByRole("button", {
        name: "Unfollow Search Filter Fixture",
      }),
    ).toBeInTheDocument()
    expect(readBuildingFollowingFromCache(queryClient, baronZotelId)).toBe(false)
  })

  it("disables all unfollow buttons while an unfollow mutation is pending", async () => {
    installFollowingsHandler()
    let resolveDelete: (() => void) | undefined
    server.use(
      http.delete(`/api/v1/building-follows/${baronZotelId}`, async () => {
        await new Promise<void>((resolve) => {
          resolveDelete = resolve
        })
        return HttpResponse.json({
          success: true,
          data: {
            _id: "follow-1",
            userId: "user-1",
            buildingId: baronZotelId,
            createdAt: "2026-07-31T10:15:30.123Z",
            updatedAt: "2026-07-31T10:15:30.123Z",
          },
        })
      }),
    )

    const queryClient = createIntegrationQueryClient()
    seedFollowedBuildingDetail(queryClient)

    const { user } = renderWithProviders(
      <UserMenuFollowedBuildingsSection userId="user-1" enabled />,
      { queryClient },
    )

    await screen.findByText("Baron Zotel Bangkok")
    const unfollowButtons = screen.getAllByRole("button", { name: /Unfollow/i })
    expect(unfollowButtons).toHaveLength(2)

    await user.click(
      screen.getByRole("button", { name: "Unfollow Baron Zotel Bangkok" }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Unfollow Search Filter Fixture" }),
      ).toBeDisabled(),
    )

    resolveDelete?.()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Unfollow Search Filter Fixture" }),
      ).not.toBeDisabled(),
    )
  })
})
