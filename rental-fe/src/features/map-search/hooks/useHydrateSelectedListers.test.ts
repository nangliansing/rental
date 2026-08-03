import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { toSearchAgentProfileFromSeed } from "@/features/agent/lister-map-search/toSearchAgentProfile"
import { createListerProfile } from "@/test/fixtures/listerProfile"
import { listingPhoto } from "@/test/fixtures/listings"

const getListerProfileById = vi.hoisted(() => vi.fn())

vi.mock("@/features/agent/api/getListerProfileById", () => ({
  getListerProfileById,
}))

import { useHydrateSelectedListers } from "./useHydrateSelectedListers"

import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import type { MapSearchFilters } from "@/features/map-search/filters/types"

const defaultSeed: ListerMapSearchSeed = {
  _id: "agent-1",
  displayName: "Nang Lian Sing",
  profilePhoto: listingPhoto,
}

function createHookProps(
  overrides: Partial<{
    filters: MapSearchFilters
    listerSeed: ListerMapSearchSeed | null
    selectedListerIds: string[]
    hydrateSelectedListers: ReturnType<typeof vi.fn>
  }> = {},
) {
  const hydrateSelectedListers = overrides.hydrateSelectedListers ?? vi.fn()

  return {
    props: {
      filters: { agentProfileIds: ["agent-1"] },
      listerSeed: null as ListerMapSearchSeed | null,
      selectedListerIds: [] as string[],
      hydrateSelectedListers,
      ...overrides,
    },
    hydrateSelectedListers,
  }
}

describe("useHydrateSelectedListers", () => {
  beforeEach(() => {
    getListerProfileById.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("does nothing when filters contain no lister ids", async () => {
    const { props, hydrateSelectedListers } = createHookProps({
      filters: { minRent: 1_000 },
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).not.toHaveBeenCalled()
      expect(getListerProfileById).not.toHaveBeenCalled()
    })
  })

  it("does nothing when all filter ids are already selected", async () => {
    const { props, hydrateSelectedListers } = createHookProps({
      selectedListerIds: ["agent-1"],
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).not.toHaveBeenCalled()
      expect(getListerProfileById).not.toHaveBeenCalled()
    })
  })

  it("treats trimmed selected ids as already hydrated", async () => {
    const { props, hydrateSelectedListers } = createHookProps({
      selectedListerIds: ["  agent-1  "],
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).not.toHaveBeenCalled()
      expect(getListerProfileById).not.toHaveBeenCalled()
    })
  })

  it("hydrates immediately from a matching lister seed without fetching", async () => {
    const { props, hydrateSelectedListers } = createHookProps({
      listerSeed: defaultSeed,
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).toHaveBeenCalledTimes(1)
      expect(hydrateSelectedListers).toHaveBeenCalledWith([
        toSearchAgentProfileFromSeed(defaultSeed),
      ])
      expect(getListerProfileById).not.toHaveBeenCalled()
    })
  })

  it("fetches missing lister profiles when no seed is available", async () => {
    const profile = createListerProfile({ _id: "agent-2", displayName: "Other" })
    getListerProfileById.mockResolvedValue(profile)

    const { props, hydrateSelectedListers } = createHookProps({
      filters: { agentProfileIds: ["agent-2"] },
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledWith(
        "agent-2",
        expect.any(AbortSignal),
      )
      expect(hydrateSelectedListers).toHaveBeenCalledWith([
        expect.objectContaining({
          _id: "agent-2",
          displayName: "Other",
        }),
      ])
    })
  })

  it("uses the seed for the matching id and fetches the remaining ids", async () => {
    const fetchedProfile = createListerProfile({
      _id: "agent-2",
      displayName: "Other",
    })
    getListerProfileById.mockResolvedValue(fetchedProfile)

    const { props, hydrateSelectedListers } = createHookProps({
      filters: { agentProfileIds: ["agent-1", "agent-2"] },
      listerSeed: defaultSeed,
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).toHaveBeenCalledTimes(2)
    })

    expect(hydrateSelectedListers.mock.calls[0]?.[0]).toEqual([
      toSearchAgentProfileFromSeed(defaultSeed),
    ])
    expect(hydrateSelectedListers.mock.calls[1]?.[0]).toEqual([
      expect.objectContaining({ _id: "agent-2", displayName: "Other" }),
    ])
    expect(getListerProfileById).toHaveBeenCalledTimes(1)
    expect(getListerProfileById).toHaveBeenCalledWith(
      "agent-2",
      expect.any(AbortSignal),
    )
  })

  it("ignores failed fetches and still hydrates successful ones", async () => {
    getListerProfileById
      .mockRejectedValueOnce(new Error("missing profile"))
      .mockResolvedValueOnce(createListerProfile({ _id: "agent-2" }))

    const { props, hydrateSelectedListers } = createHookProps({
      filters: { agentProfileIds: ["agent-1", "agent-2"] },
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).toHaveBeenCalledTimes(1)
      expect(hydrateSelectedListers).toHaveBeenCalledWith([
        expect.objectContaining({ _id: "agent-2" }),
      ])
    })
  })

  it("does not hydrate from fetch results when every request fails", async () => {
    getListerProfileById.mockRejectedValue(new Error("network error"))

    const { props, hydrateSelectedListers } = createHookProps({
      filters: { agentProfileIds: ["agent-1"] },
    })

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledTimes(1)
    })

    expect(hydrateSelectedListers).not.toHaveBeenCalled()
  })

  it("aborts in-flight fetches on unmount before hydrating stale results", async () => {
    let rejectFetch: ((reason?: unknown) => void) | undefined
    getListerProfileById.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectFetch = reject
        }),
    )

    const { props, hydrateSelectedListers } = createHookProps({
      filters: { agentProfileIds: ["agent-1"] },
    })

    const { unmount } = renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledTimes(1)
    })

    unmount()
    rejectFetch?.(new DOMException("Aborted", "AbortError"))

    await waitFor(() => {
      expect(hydrateSelectedListers).not.toHaveBeenCalled()
    })
  })

  it("does not rehydrate after selected ids catch up on rerender", async () => {
    const { props, hydrateSelectedListers } = createHookProps({
      listerSeed: defaultSeed,
    })

    const { rerender } = renderHook(
      (input) => useHydrateSelectedListers(input),
      { initialProps: props },
    )

    await waitFor(() => {
      expect(hydrateSelectedListers).toHaveBeenCalledTimes(1)
    })

    rerender({
      ...props,
      selectedListerIds: ["agent-1"],
    })

    await waitFor(() => {
      expect(hydrateSelectedListers).toHaveBeenCalledTimes(1)
      expect(getListerProfileById).not.toHaveBeenCalled()
    })
  })

  it("uses the latest hydrate callback when a fetch resolves after rerender", async () => {
    const initialHydrate = vi.fn()
    const nextHydrate = vi.fn()
    let resolveFetch: ((profile: ReturnType<typeof createListerProfile>) => void) | undefined

    getListerProfileById.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const baseProps = {
      filters: { agentProfileIds: ["agent-1"] },
      listerSeed: null,
      selectedListerIds: [] as string[],
    }

    const { rerender } = renderHook(
      (input) => useHydrateSelectedListers(input),
      {
        initialProps: {
          ...baseProps,
          hydrateSelectedListers: initialHydrate,
        },
      },
    )

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledTimes(1)
    })

    rerender({
      ...baseProps,
      hydrateSelectedListers: nextHydrate,
    })

    resolveFetch?.(createListerProfile({ _id: "agent-1" }))

    await waitFor(() => {
      expect(nextHydrate).toHaveBeenCalledTimes(1)
    })

    expect(initialHydrate).not.toHaveBeenCalled()
  })

  it("completes fetch hydration in bounded time for many ids", async () => {
    const ids = Array.from({ length: 20 }, (_, index) => `agent-${index}`)
    getListerProfileById.mockImplementation(async (agentProfileId: string) =>
      createListerProfile({ _id: agentProfileId }),
    )

    const { props, hydrateSelectedListers } = createHookProps({
      filters: { agentProfileIds: ids },
    })

    const startedAt = performance.now()

    renderHook(() => useHydrateSelectedListers(props))

    await waitFor(() => {
      expect(hydrateSelectedListers).toHaveBeenCalledTimes(1)
      expect(hydrateSelectedListers.mock.calls[0]?.[0]).toHaveLength(20)
    })

    expect(performance.now() - startedAt).toBeLessThan(500)
    expect(getListerProfileById).toHaveBeenCalledTimes(20)
  })
})
