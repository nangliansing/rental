import { describe, expect, it } from "vitest"

import { normalizeReadOnlyMapGeo } from "./normalizeReadOnlyMapGeo"

const position = { lat: 13.7308, lng: 100.5418 }
const bounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
}

describe("normalizeReadOnlyMapGeo", () => {
  it("normalizes a point and fingerprints the scene", () => {
    expect(
      normalizeReadOnlyMapGeo({
        kind: "point",
        position,
      }),
    ).toEqual({
      kind: "point",
      position,
      sceneKey: "point:13.730800,100.541800",
    })
  })

  it("copies point coordinates so callers cannot mutate the scene", () => {
    const input = { lat: 13.73, lng: 100.54 }
    const scene = normalizeReadOnlyMapGeo({
      kind: "point",
      position: input,
    })!

    input.lat = 99
    expect(scene.position.lat).toBe(13.73)
  })

  it("normalizes a circle and rounds meters", () => {
    expect(
      normalizeReadOnlyMapGeo({
        kind: "circle",
        center: { lat: 13.73, lng: 100.54 },
        radiusMeters: 800.4,
      }),
    ).toEqual({
      kind: "circle",
      center: { lat: 13.73, lng: 100.54 },
      radiusMeters: 800,
      sceneKey: "circle:13.730000,100.540000:800",
    })
  })

  it.each([1, 500, 2000, 5000])(
    "accepts boundary coverage meters %s for circles",
    radiusMeters => {
      expect(
        normalizeReadOnlyMapGeo({
          kind: "circle",
          center: position,
          radiusMeters,
        }),
      ).toMatchObject({ kind: "circle", radiusMeters })
    },
  )

  it("normalizes line paths and distance", () => {
    const scene = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 400.6,
      paths: [
        [
          { lat: 13.75, lng: 100.5 },
          { lat: 13.76, lng: 100.52 },
        ],
      ],
    })

    expect(scene).toMatchObject({
      kind: "line",
      distanceMeters: 401,
    })
    expect(scene?.sceneKey.startsWith("line:")).toBe(true)
  })

  it("normalizes MultiLine paths into a stable fingerprint", () => {
    const left = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 400,
      paths: [
        [
          { lat: 13.75, lng: 100.5 },
          { lat: 13.76, lng: 100.52 },
        ],
        [
          { lat: 13.7, lng: 100.6 },
          { lat: 13.71, lng: 100.61 },
        ],
      ],
    })
    const right = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 400,
      paths: [
        [
          { lat: 13.75, lng: 100.5 },
          { lat: 13.76, lng: 100.52 },
        ],
        [
          { lat: 13.7, lng: 100.6 },
          { lat: 13.71, lng: 100.61 },
        ],
      ],
    })

    expect(left?.sceneKey).toBe(right?.sceneKey)
    expect(left?.kind).toBe("line")
  })

  it("normalizes area bounds", () => {
    expect(
      normalizeReadOnlyMapGeo({
        kind: "area",
        bounds,
      }),
    ).toEqual({
      kind: "area",
      bounds,
      sceneKey: "area:13.750000,100.620000:13.780000,100.660000",
    })
  })

  it("produces identical sceneKeys for equivalent geos", () => {
    const left = normalizeReadOnlyMapGeo({
      kind: "point",
      position: { lat: 13.73, lng: 100.54 },
    })
    const right = normalizeReadOnlyMapGeo({
      kind: "point",
      position: { lat: 13.73, lng: 100.54 },
    })

    expect(left?.sceneKey).toBe(right?.sceneKey)
  })

  it("changes sceneKey when circle radius changes", () => {
    const small = normalizeReadOnlyMapGeo({
      kind: "circle",
      center: position,
      radiusMeters: 400,
    })
    const large = normalizeReadOnlyMapGeo({
      kind: "circle",
      center: position,
      radiusMeters: 800,
    })

    expect(small?.sceneKey).not.toBe(large?.sceneKey)
  })

  it.each([
    [null],
    [undefined],
    [{ kind: "point", position: { lat: 999, lng: 100 } }],
    [{ kind: "point", position: { lat: 13, lng: 200 } }],
    [{ kind: "point", position: { lat: Number.NaN, lng: 100 } }],
    [{ kind: "circle", center: { lat: 13, lng: 100 }, radiusMeters: 0 }],
    [{ kind: "circle", center: { lat: 13, lng: 100 }, radiusMeters: -1 }],
    [{ kind: "circle", center: { lat: 13, lng: 100 }, radiusMeters: 5000.5 }],
    [{ kind: "circle", center: { lat: 13, lng: 100 }, radiusMeters: 9000 }],
    [
      {
        kind: "circle",
        center: { lat: 13, lng: 100 },
        radiusMeters: Number.POSITIVE_INFINITY,
      },
    ],
    [{ kind: "line", paths: [[{ lat: 13, lng: 100 }]], distanceMeters: 400 }],
    [
      {
        kind: "line",
        paths: [
          [
            { lat: 13.75, lng: 100.5 },
            { lat: 13.76, lng: 100.52 },
          ],
        ],
        distanceMeters: 0,
      },
    ],
    [
      {
        kind: "area",
        bounds: {
          northEast: { lat: 13.7, lng: 100.5 },
          southWest: { lat: 13.8, lng: 100.6 },
        },
      },
    ],
    [
      {
        kind: "area",
        bounds: {
          northEast: { lat: 13.78, lng: 100.62 },
          southWest: { lat: 13.75, lng: 100.66 },
        },
      },
    ],
    [{ kind: "unknown" }],
    [{}],
  ])("rejects invalid geo %j", geo => {
    expect(normalizeReadOnlyMapGeo(geo as never)).toBeNull()
  })
})
