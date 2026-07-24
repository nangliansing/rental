import { memo, useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  MapSearchMarkerHighlightContext,
  useMapSearchMarkerHighlight,
} from "./MapSearchMarkerHighlightContext"
import {
  MapSearchCanvasContext,
  MapSearchControlsContext,
  MapSearchResultsContext,
  useMapSearchCanvas,
  useMapSearchControls,
  useMapSearchResults,
} from "./MapSearchSessionContext"

const canvasValue = {
  buildings: [],
  selectedBuilding: null,
} as never

const resultsValue = {
  buildings: [{ _id: "1" }],
} as never

const CanvasProbe = memo(function CanvasProbe({ onRender }: { onRender: () => void }) {
  onRender()
  const { buildings } = useMapSearchCanvas()
  return <span>canvas:{buildings.length}</span>
})

const ControlsProbe = memo(function ControlsProbe({ onRender }: { onRender: () => void }) {
  onRender()
  const { nearbyRadiusMeters } = useMapSearchControls()
  return <span>controls:{nearbyRadiusMeters}</span>
})

const ResultsProbe = memo(function ResultsProbe({
  onRender,
}: {
  onRender: () => void
}) {
  onRender()
  const { buildings } = useMapSearchResults()
  return <span>results:{buildings.length}</span>
})

const MarkerHighlightProbe = memo(function MarkerHighlightProbe({
  onRender,
}: {
  onRender: () => void
}) {
  onRender()
  const { hoveredBuildingId } = useMapSearchMarkerHighlight()
  return <span>highlight:{hoveredBuildingId ?? "none"}</span>
})

function Harness({
  onCanvasRender,
  onControlsRender,
  onResultsRender,
}: {
  onCanvasRender: () => void
  onControlsRender: () => void
  onResultsRender?: () => void
}) {
  const [radius, setRadius] = useState(500)
  const controlsValue = { nearbyRadiusMeters: radius } as never

  return (
    <MapSearchCanvasContext.Provider value={canvasValue}>
      <MapSearchControlsContext.Provider value={controlsValue}>
        <MapSearchResultsContext.Provider value={resultsValue}>
          <CanvasProbe onRender={onCanvasRender} />
          <ControlsProbe onRender={onControlsRender} />
          {onResultsRender ? <ResultsProbe onRender={onResultsRender} /> : null}
          <button type="button" onClick={() => setRadius(750)}>
            Change controls
          </button>
        </MapSearchResultsContext.Provider>
      </MapSearchControlsContext.Provider>
    </MapSearchCanvasContext.Provider>
  )
}

function MarkerHighlightHarness({
  onCanvasRender,
  onHighlightRender,
}: {
  onCanvasRender: () => void
  onHighlightRender: () => void
}) {
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null)
  const highlightValue = {
    hoveredBuildingId,
    selectedBuildingId: null,
  }

  return (
    <MapSearchCanvasContext.Provider value={canvasValue}>
      <MapSearchMarkerHighlightContext.Provider value={highlightValue}>
        <CanvasProbe onRender={onCanvasRender} />
        <MarkerHighlightProbe onRender={onHighlightRender} />
        <button type="button" onClick={() => setHoveredBuildingId("building-1")}>
          Hover building
        </button>
      </MapSearchMarkerHighlightContext.Provider>
    </MapSearchCanvasContext.Provider>
  )
}

describe("map-search context render isolation", () => {
  it("does not rerender a memoized canvas consumer for a controls-only change", () => {
    const onCanvasRender = vi.fn()
    const onControlsRender = vi.fn()
    render(
      <Harness
        onCanvasRender={onCanvasRender}
        onControlsRender={onControlsRender}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Change controls" }))

    expect(onCanvasRender).toHaveBeenCalledTimes(1)
    expect(onControlsRender).toHaveBeenCalledTimes(2)
    expect(screen.getByText("controls:750")).toBeVisible()
  })

  it("does not rerender a memoized results consumer for a controls-only change", () => {
    const onCanvasRender = vi.fn()
    const onControlsRender = vi.fn()
    const onResultsRender = vi.fn()
    render(
      <Harness
        onCanvasRender={onCanvasRender}
        onControlsRender={onControlsRender}
        onResultsRender={onResultsRender}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Change controls" }))

    expect(onCanvasRender).toHaveBeenCalledTimes(1)
    expect(onResultsRender).toHaveBeenCalledTimes(1)
    expect(onControlsRender).toHaveBeenCalledTimes(2)
  })

  it("does not rerender canvas when only marker highlight changes", () => {
    const onCanvasRender = vi.fn()
    const onHighlightRender = vi.fn()
    render(
      <MarkerHighlightHarness
        onCanvasRender={onCanvasRender}
        onHighlightRender={onHighlightRender}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Hover building" }))

    expect(onCanvasRender).toHaveBeenCalledTimes(1)
    expect(onHighlightRender).toHaveBeenCalledTimes(2)
    expect(screen.getByText("highlight:building-1")).toBeVisible()
  })
})
