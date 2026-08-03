import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { toSearchAgentProfileFromSeed } from "@/features/agent/lister-map-search/toSearchAgentProfile"
import { listingPhoto } from "@/test/fixtures/listings"

import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import type { MapSearchFilters } from "@/features/map-search/filters/types"

const toast = vi.hoisted(() => vi.fn())
const useMapSearchFilters = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-toast", () => ({
  toast,
}))

vi.mock("../../context/MapSearchFilterContext", () => ({
  useMapSearchFilters,
}))

import { ListerMapSearchArrivalToast } from "./ListerMapSearchArrivalToast"

const defaultSeed: ListerMapSearchSeed = {
  _id: "agent-1",
  displayName: "Nang Lian Sing",
  profilePhoto: listingPhoto,
}

function mockFilterContext({
  submittedFilters = { agentProfileIds: ["agent-1"] },
  selectedListers = [],
}: {
  submittedFilters?: MapSearchFilters
  selectedListers?: ReturnType<typeof toSearchAgentProfileFromSeed>[]
} = {}) {
  useMapSearchFilters.mockReturnValue({
    submittedFilters,
    selectedListers,
    selectedListerIds: selectedListers.map((lister) => lister._id),
  })
}

function renderToast(
  props: Partial<{
    isSearchIdle: boolean
    listerSeed: ListerMapSearchSeed | null
  }> = {},
) {
  return render(
    <ListerMapSearchArrivalToast
      isSearchIdle={props.isSearchIdle ?? true}
      listerSeed={props.listerSeed ?? null}
    />,
  )
}

describe("ListerMapSearchArrivalToast", () => {
  beforeEach(() => {
    toast.mockReset()
    useMapSearchFilters.mockReset()
    mockFilterContext()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing", () => {
    const { container } = renderToast()

    expect(container.firstChild).toBeNull()
  })

  it("does not toast while search is not idle", async () => {
    renderToast({ isSearchIdle: false, listerSeed: defaultSeed })

    await waitFor(() => {
      expect(toast).not.toHaveBeenCalled()
    })
  })

  it("does not toast when submitted filters contain no lister ids", async () => {
    mockFilterContext({ submittedFilters: { minRent: 2_000 } })

    renderToast({ listerSeed: defaultSeed })

    await waitFor(() => {
      expect(toast).not.toHaveBeenCalled()
    })
  })

  it("shows a search-hint toast with the seed display name when idle", async () => {
    renderToast({ listerSeed: defaultSeed })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
      expect(toast).toHaveBeenCalledWith({
        title: "Search an area to see Nang Lian Sing's listings",
        variant: "search-hint",
      })
    })
  })

  it("prefers the seed display name over hydrated selected listers", async () => {
    mockFilterContext({
      selectedListers: [
        toSearchAgentProfileFromSeed({
          _id: "agent-1",
          displayName: "Hydrated Name",
          profilePhoto: null,
        }),
      ],
    })

    renderToast({ listerSeed: defaultSeed })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Search an area to see Nang Lian Sing's listings",
        variant: "search-hint",
      })
    })
  })

  it("waits for hydration before toasting when no seed is available", async () => {
    mockFilterContext({
      selectedListers: [],
    })

    const { rerender } = renderToast({ listerSeed: null, isSearchIdle: true })

    await waitFor(() => {
      expect(toast).not.toHaveBeenCalled()
    })

    mockFilterContext({
      selectedListers: [
        toSearchAgentProfileFromSeed({
          _id: "agent-1",
          displayName: "Hydrated Lister",
          profilePhoto: null,
        }),
      ],
    })

    rerender(
      <ListerMapSearchArrivalToast isSearchIdle listerSeed={null} />,
    )

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Search an area to see Hydrated Lister's listings",
        variant: "search-hint",
      })
    })
  })

  it("falls back to a generic lister label when no display name is available", async () => {
    mockFilterContext({
      selectedListers: [
        toSearchAgentProfileFromSeed({
          _id: "agent-1",
          displayName: null,
          profilePhoto: null,
        }),
      ],
    })

    renderToast({ listerSeed: null })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Search an area to see this lister's listings",
        variant: "search-hint",
      })
    })
  })

  it("normalizes a blank seed display name to Lister", async () => {
    renderToast({
      listerSeed: {
        _id: "agent-1",
        displayName: "   ",
        profilePhoto: null,
      },
    })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Search an area to see Lister's listings",
        variant: "search-hint",
      })
    })
  })

  it("shows the toast when search becomes idle", async () => {
    const { rerender } = renderToast({
      isSearchIdle: false,
      listerSeed: defaultSeed,
    })

    expect(toast).not.toHaveBeenCalled()

    rerender(
      <ListerMapSearchArrivalToast
        isSearchIdle
        listerSeed={defaultSeed}
      />,
    )

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })
  })

  it("shows the toast only once even after rerenders", async () => {
    const { rerender } = renderToast({ listerSeed: defaultSeed })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })

    rerender(
      <ListerMapSearchArrivalToast
        isSearchIdle
        listerSeed={defaultSeed}
      />,
    )

    mockFilterContext({
      submittedFilters: { agentProfileIds: ["agent-1", "agent-2"] },
      selectedListers: [
        toSearchAgentProfileFromSeed({
          _id: "agent-2",
          displayName: "Another Lister",
          profilePhoto: null,
        }),
      ],
    })

    rerender(
      <ListerMapSearchArrivalToast
        isSearchIdle
        listerSeed={defaultSeed}
      />,
    )

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })
  })

  it("does not show again after search leaves idle and returns", async () => {
    const { rerender } = renderToast({
      isSearchIdle: false,
      listerSeed: defaultSeed,
    })

    rerender(
      <ListerMapSearchArrivalToast
        isSearchIdle
        listerSeed={defaultSeed}
      />,
    )

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })

    rerender(
      <ListerMapSearchArrivalToast
        isSearchIdle={false}
        listerSeed={defaultSeed}
      />,
    )

    rerender(
      <ListerMapSearchArrivalToast
        isSearchIdle
        listerSeed={defaultSeed}
      />,
    )

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(1)
    })
  })

  it("toasts for legacy listerIds in submitted filters", async () => {
    mockFilterContext({ submittedFilters: { listerIds: ["agent-legacy"] } })

    renderToast({
      listerSeed: {
        _id: "agent-legacy",
        displayName: "Legacy Lister",
        profilePhoto: null,
      },
    })

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Search an area to see Legacy Lister's listings",
        variant: "search-hint",
      })
    })
  })
})
