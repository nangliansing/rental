import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LineSearchOverlays } from "./MapSearchOverlays"

const coverageMocks = vi.hoisted(() => ({ build: vi.fn() }))

vi.mock("@vis.gl/react-google-maps", () => ({
  AdvancedMarker: ({ children }: { children: ReactNode }) => children,
  Circle: () => null,
  Polygon: () => null,
  Polyline: () => null,
}))
vi.mock("../../utils/line-coverage", () => ({
  buildLineCoveragePolygon: coverageMocks.build,
}))

describe("LineSearchOverlays", () => {
  beforeEach(() => {
    coverageMocks.build.mockReset()
    coverageMocks.build.mockReturnValue([])
  })

  it("rebuilds coverage only when geometry inputs change", () => {
    const points = [
      { lat: 13.7, lng: 100.6 },
      { lat: 13.8, lng: 100.7 },
    ]
    const { rerender } = render(
      <LineSearchOverlays points={points} distanceMeters={500} />,
    )

    rerender(<LineSearchOverlays points={points} distanceMeters={500} />)
    expect(coverageMocks.build).toHaveBeenCalledOnce()

    rerender(<LineSearchOverlays points={points} distanceMeters={750} />)
    expect(coverageMocks.build).toHaveBeenCalledTimes(2)
  })

  it("does not build coverage for an invalid distance", () => {
    render(
      <LineSearchOverlays
        points={[
          { lat: 13.7, lng: 100.6 },
          { lat: 13.8, lng: 100.7 },
        ]}
        distanceMeters={Number.NaN}
      />,
    )

    expect(coverageMocks.build).not.toHaveBeenCalled()
  })
})
