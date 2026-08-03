import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LISTER_MAP_SEARCH_LOCATION_STATE_KEY } from "@/features/agent/lister-map-search/navigationState"
import { listingPhoto } from "@/test/fixtures/listings"

import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import type { MapSearchFilters } from "@/features/map-search/filters/types"

const useHydrateSelectedListers = vi.hoisted(() => vi.fn())
const useMapSearchFilters = vi.hoisted(() => vi.fn())

vi.mock("../../hooks/useHydrateSelectedListers", () => ({
  useHydrateSelectedListers,
}))

vi.mock("../../context/MapSearchFilterContext", () => ({
  useMapSearchFilters,
}))

import { SelectedListerHydrator } from "./SelectedListerHydrator"

const defaultSeed: ListerMapSearchSeed = {
  _id: "agent-1",
  displayName: "Nang Lian Sing",
  profilePhoto: listingPhoto,
}

const defaultFilters: MapSearchFilters = {
  agentProfileIds: ["agent-1"],
}

function mockFilterContext({
  selectedListerIds = [] as string[],
  hydrateSelectedListers = vi.fn(),
}: {
  selectedListerIds?: string[]
  hydrateSelectedListers?: ReturnType<typeof vi.fn>
} = {}) {
  useMapSearchFilters.mockReturnValue({
    selectedListerIds,
    hydrateSelectedListers,
  })

  return { hydrateSelectedListers }
}

function renderHydrator(
  props: Partial<{
    filters: MapSearchFilters
    listerSeed: ListerMapSearchSeed | null
  }> = {},
) {
  return render(
    <SelectedListerHydrator
      filters={props.filters ?? defaultFilters}
      listerSeed={props.listerSeed ?? defaultSeed}
    />,
  )
}

describe("SelectedListerHydrator", () => {
  beforeEach(() => {
    useHydrateSelectedListers.mockReset()
    useMapSearchFilters.mockReset()
    window.history.replaceState({}, "", "/")
  })

  afterEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, "", "/")
  })

  it("renders nothing", () => {
    mockFilterContext()
    const { container } = renderHydrator()

    expect(container.firstChild).toBeNull()
  })

  it("wires filter context values into useHydrateSelectedListers", () => {
    const { hydrateSelectedListers } = mockFilterContext({
      selectedListerIds: ["agent-1", "agent-2"],
    })

    renderHydrator({
      filters: { agentProfileIds: ["agent-1"] },
      listerSeed: defaultSeed,
    })

    expect(useHydrateSelectedListers).toHaveBeenCalledWith({
      filters: { agentProfileIds: ["agent-1"] },
      listerSeed: defaultSeed,
      selectedListerIds: ["agent-1", "agent-2"],
      hydrateSelectedListers,
    })
  })

  it("passes updated props to useHydrateSelectedListers on rerender", () => {
    const { hydrateSelectedListers } = mockFilterContext()

    const { rerender } = renderHydrator({
      filters: { agentProfileIds: ["agent-1"] },
      listerSeed: defaultSeed,
    })

    rerender(
      <SelectedListerHydrator
        filters={{ agentProfileIds: ["agent-2"] }}
        listerSeed={null}
      />,
    )

    expect(useHydrateSelectedListers).toHaveBeenLastCalledWith({
      filters: { agentProfileIds: ["agent-2"] },
      listerSeed: null,
      selectedListerIds: [],
      hydrateSelectedListers,
    })
  })

  it("clears the lister seed from router history on mount", () => {
    mockFilterContext()

    window.history.replaceState(
      {
        [LISTER_MAP_SEARCH_LOCATION_STATE_KEY]: defaultSeed,
        preserved: "value",
      },
      "",
      "/?filters=agent#map",
    )

    const replaceState = vi.spyOn(window.history, "replaceState")
    replaceState.mockClear()

    renderHydrator()

    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(replaceState).toHaveBeenCalledWith(
      { preserved: "value" },
      "",
      "/?filters=agent#map",
    )
  })

  it("does not replace history when the lister seed key is absent", () => {
    mockFilterContext()

    window.history.replaceState({ preserved: "value" }, "", "/map")

    const replaceState = vi.spyOn(window.history, "replaceState")
    replaceState.mockClear()

    renderHydrator()

    expect(replaceState).not.toHaveBeenCalled()
  })

  it("does not replace history when state is null", () => {
    mockFilterContext()

    window.history.replaceState(null, "", "/map")

    const replaceState = vi.spyOn(window.history, "replaceState")
    replaceState.mockClear()

    renderHydrator()

    expect(replaceState).not.toHaveBeenCalled()
  })

  it("does not replace history when state is not an object", () => {
    mockFilterContext()

    window.history.replaceState("invalid", "", "/map")

    const replaceState = vi.spyOn(window.history, "replaceState")
    replaceState.mockClear()

    renderHydrator()

    expect(replaceState).not.toHaveBeenCalled()
  })

  it("clears router seed only once even after rerender", () => {
    mockFilterContext()

    window.history.replaceState(
      {
        [LISTER_MAP_SEARCH_LOCATION_STATE_KEY]: defaultSeed,
      },
      "",
      "/",
    )

    const replaceState = vi.spyOn(window.history, "replaceState")
    replaceState.mockClear()

    const { rerender } = renderHydrator()

    rerender(
      <SelectedListerHydrator
        filters={{ agentProfileIds: ["agent-2"] }}
        listerSeed={null}
      />,
    )

    expect(replaceState).toHaveBeenCalledTimes(1)
  })
})
