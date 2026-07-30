import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  updateOwnerListing: vi.fn(),
}))

vi.mock("./updateOwnerListing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./updateOwnerListing")>()
  return {
    ...actual,
    updateOwnerListing: mocks.updateOwnerListing,
  }
})

import { useUpdateOwnerListing } from "./useUpdateOwnerListing"

function createUpdatedListing(availableAt: string | null) {
  return {
    _id: "listing-1",
    visibility: "PUBLIC" as const,
    isForeignerAccepted: true,
    isTM30Provided: false,
    rent: 14000,
    deposit: 28000,
    moveInCost: 42000,
    electricRate: null,
    waterRate: null,
    bedroomCount: 1,
    bathroomCount: 1,
    kitchenType: "Kitchen",
    size: 36,
    contractMonths: 3,
    occupancy: 1,
    isCookingAllowed: true,
    isPetAllowed: false,
    facilities: [] as string[],
    media: [],
    description: "Test room",
    availableAt,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    listedBy: "user-1",
    buildingId: "building-1",
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T01:00:00.000Z",
  }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  const publicDetailKey = queryKeys.listings.publicDetail("listing-1", "user-1")
  const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
  const ownerListKey = queryKeys.listings.ownerList({
    filter: "all",
    sort: "latest",
    limit: 20,
  })

  queryClient.setQueryData(publicDetailKey, {
    _id: "listing-1",
    availableAt: null,
    rent: 14000,
  })
  queryClient.setQueryData(ownerDetailKey, {
    listing: { _id: "listing-1", availableAt: null, rent: 14000 },
  })
  queryClient.setQueryData(ownerListKey, {
    data: [{ _id: "listing-1", availableAt: null, rent: 14000 }],
    pagination: { page: 1, limit: 20, total: 1 },
  })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useUpdateOwnerListing(), { wrapper: Wrapper }),
    queryClient,
    publicDetailKey,
    ownerDetailKey,
    ownerListKey,
  }
}

describe("useUpdateOwnerListing availableAt query state", () => {
  beforeEach(() => {
    mocks.updateOwnerListing.mockReset()
  })

  it("optimistically patches availableAt across related listing queries", async () => {
    const { result, queryClient, publicDetailKey, ownerDetailKey, ownerListKey } =
      setup()

    let resolveMutation!: (value: ReturnType<typeof createUpdatedListing>) => void
    mocks.updateOwnerListing.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve
        }),
    )

    act(() => {
      result.current.mutate({
        listingId: "listing-1",
        values: { availableAt: "2026-08-15" },
      })
    })

    await waitFor(() => {
      expect(queryClient.getQueryData(publicDetailKey)).toMatchObject({
        availableAt: "2026-08-15",
      })
    })
    expect(queryClient.getQueryData(ownerDetailKey)).toMatchObject({
      listing: { availableAt: "2026-08-15" },
    })
    expect(queryClient.getQueryData(ownerListKey)).toMatchObject({
      data: [{ availableAt: "2026-08-15" }],
    })

    await act(async () => {
      resolveMutation(
        createUpdatedListing("2026-08-14T17:00:00.000Z"),
      )
    })

    await waitFor(() => {
      expect(queryClient.getQueryData(publicDetailKey)).toMatchObject({
        availableAt: "2026-08-14T17:00:00.000Z",
      })
    })
  })

  it("rolls availableAt back when the mutation fails", async () => {
    const { result, queryClient, publicDetailKey } = setup()

    mocks.updateOwnerListing.mockRejectedValue(
      new Error("Could not update listing availability."),
    )

    act(() => {
      result.current.mutate({
        listingId: "listing-1",
        values: { availableAt: "2026-08-15" },
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(queryClient.getQueryData(publicDetailKey)).toMatchObject({
      availableAt: null,
    })
  })

  it("patches Flexible (null) and restores on error", async () => {
    const { result, queryClient, publicDetailKey } = setup()

    queryClient.setQueryData(publicDetailKey, {
      _id: "listing-1",
      availableAt: "2026-08-14T17:00:00.000Z",
      rent: 14000,
    })

    mocks.updateOwnerListing.mockRejectedValue(new Error("network"))

    act(() => {
      result.current.mutate({
        listingId: "listing-1",
        values: { availableAt: null },
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(queryClient.getQueryData(publicDetailKey)).toMatchObject({
      availableAt: "2026-08-14T17:00:00.000Z",
    })
  })
})
