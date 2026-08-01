import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import { setAccessToken } from "@/lib/api-client"
import { server } from "@/test/server"

import { searchUserBuildingFollows } from "../api/searchUserBuildingFollows"
import { readBuildingFollowingFromCache } from "../utils/buildingFollowCache"
import { useBuildingFollowingFromCache } from "./useBuildingFollowingFromCache"
import { useOptimisticBuildingFollowToggle } from "./useOptimisticBuildingFollowToggle"

const buildingId = "baron-zotel"

const buildingPayload = {
  _id: buildingId,
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

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function seedFollowedBuildingCaches(queryClient: QueryClient) {
  queryClient.setQueryData(queryKeys.buildings.detail(buildingId), {
    ...buildingPayload,
    isFollowing: true,
  })
}

async function hydrateFollowingsList(queryClient: QueryClient) {
  const response = await searchUserBuildingFollows({ userId: "user-1" })

  queryClient.setQueryData(
    queryKeys.buildingFollows.list({ userId: "user-1", limit: 20 }),
    {
      pages: [
        {
          data: response.data,
          pagination: response.pagination,
        },
      ],
      pageParams: [1],
    },
  )
}

describe("building follow viewer state integration", () => {
  beforeEach(() => {
    setAccessToken("access-token")
    server.use(
      http.get("/api/v1/building-follows/users/user-1", () =>
        HttpResponse.json({
          success: true,
          data: {
            followings: [
              {
                _id: "follow-1",
                buildingId,
                createdAt: "2026-07-31T10:15:30.123Z",
                updatedAt: "2026-07-31T10:15:30.123Z",
                building: buildingPayload,
              },
            ],
          },
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      ),
    )
  })

  it("keeps followed state after the followings list is hydrated", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    seedFollowedBuildingCaches(queryClient)
    await hydrateFollowingsList(queryClient)

    expect(readBuildingFollowingFromCache(queryClient, buildingId)).toBe(true)

    const { result } = renderHook(
      () =>
        useBuildingFollowingFromCache({
          buildingId,
          fallbackIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    expect(result.current).toBe(true)
  })

  it("keeps the building page toggle followed after followings load", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    seedFollowedBuildingCaches(queryClient)
    await hydrateFollowingsList(queryClient)

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId,
          initialIsFollowing: true,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.isFollowing).toBe(true))
  })

  it("still unfollows from the building toggle after followings load", async () => {
    server.use(
      http.delete(`/api/v1/building-follows/${buildingId}`, () =>
        HttpResponse.json({
          success: true,
          data: {
            _id: "follow-1",
            userId: "user-1",
            buildingId,
            createdAt: "2026-07-31T10:15:30.123Z",
            updatedAt: "2026-07-31T10:15:30.123Z",
          },
        }),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    seedFollowedBuildingCaches(queryClient)
    await hydrateFollowingsList(queryClient)

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId,
          initialIsFollowing: true,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.isFollowing).toBe(false))
    expect(readBuildingFollowingFromCache(queryClient, buildingId)).toBe(false)
  })
})
