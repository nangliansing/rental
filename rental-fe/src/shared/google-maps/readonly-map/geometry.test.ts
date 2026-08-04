import { describe, expect, it } from "vitest"

import {
  normalizeMapPaths,
  searchLinesGeometryToPaths,
} from "./geometry"

const point = (lat: number, lng: number) => ({ lat, lng })
const lngLat = (lng: number, lat: number) => [lng, lat] as [number, number]

describe("searchLinesGeometryToPaths", () => {
  it("converts LineString [lng, lat] into one path", () => {
    expect(
      searchLinesGeometryToPaths({
        type: "LineString",
        coordinates: [lngLat(100.5, 13.75), lngLat(100.52, 13.76)],
      }),
    ).toEqual([[point(13.75, 100.5), point(13.76, 100.52)]])
  })

  it("converts MultiLineString into multiple paths and drops invalid segments", () => {
    expect(
      searchLinesGeometryToPaths({
        type: "MultiLineString",
        coordinates: [
          [lngLat(100.5, 13.75), lngLat(100.52, 13.76)],
          [lngLat(100.6, 13.7)],
          [
            lngLat(100.6, 13.7),
            lngLat(100.61, 13.71),
            lngLat(100.62, 13.72),
          ],
        ],
      }),
    ).toEqual([
      [point(13.75, 100.5), point(13.76, 100.52)],
      [point(13.7, 100.6), point(13.71, 100.61), point(13.72, 100.62)],
    ])
  })

  it("caps LineString coordinates at 24 points", () => {
    const coordinates = Array.from({ length: 30 }, (_, index) =>
      lngLat(100 + index * 0.001, 13 + index * 0.001),
    )
    const paths = searchLinesGeometryToPaths({
      type: "LineString",
      coordinates,
    })

    expect(paths).toHaveLength(1)
    expect(paths?.[0]).toHaveLength(24)
    expect(paths?.[0]?.[0]).toEqual(point(13, 100))
    expect(paths?.[0]?.[23]).toEqual(point(13.023, 100.023))
  })

  it("caps MultiLineString to 8 paths", () => {
    const coordinates = Array.from({ length: 12 }, (_, index) => [
      lngLat(100 + index, 13),
      lngLat(100.1 + index, 13.1),
    ])
    const paths = searchLinesGeometryToPaths({
      type: "MultiLineString",
      coordinates,
    })

    expect(paths).toHaveLength(8)
  })

  it("skips invalid coordinate pairs inside an otherwise valid path", () => {
    expect(
      searchLinesGeometryToPaths({
        type: "LineString",
        coordinates: [
          lngLat(100.5, 13.75),
          [Number.NaN, 13.755] as never,
          lngLat(100.52, 13.76),
          [100.53, 999] as never,
        ],
      }),
    ).toEqual([[point(13.75, 100.5), point(13.76, 100.52)]])
  })

  it.each([
    [null],
    [undefined],
    [{ type: "LineString", coordinates: [lngLat(100.5, 13.75)] }],
    [{ type: "Point", coordinates: lngLat(100.5, 13.75) }],
    [{ type: "MultiLineString", coordinates: [[lngLat(100.5, 13.75)]] }],
    [{ type: "MultiLineString", coordinates: "bad" }],
    [{ type: "LineString", coordinates: null }],
  ])("rejects invalid geometry %j", geometry => {
    expect(searchLinesGeometryToPaths(geometry as never)).toBeNull()
  })
})

describe("normalizeMapPaths", () => {
  it("filters invalid points and short paths", () => {
    expect(
      normalizeMapPaths([
        [
          point(13.75, 100.5),
          point(999, 100.5),
          point(13.76, 100.52),
        ],
        [point(13.7, 100.6)],
        null as never,
      ]),
    ).toEqual([[point(13.75, 100.5), point(13.76, 100.52)]])
  })

  it("caps each path at 24 points and path count at 8", () => {
    const longPath = Array.from({ length: 30 }, (_, index) =>
      point(13 + index * 0.001, 100 + index * 0.001),
    )
    const manyPaths = Array.from({ length: 12 }, (_, index) => [
      point(13, 100 + index),
      point(13.1, 100.1 + index),
    ])

    expect(normalizeMapPaths([longPath])?.[0]).toHaveLength(24)
    expect(normalizeMapPaths(manyPaths)).toHaveLength(8)
  })

  it("returns null for empty or invalid input", () => {
    expect(normalizeMapPaths([])).toBeNull()
    expect(normalizeMapPaths(null)).toBeNull()
    expect(normalizeMapPaths(undefined)).toBeNull()
    expect(normalizeMapPaths([[point(13, 100)]])).toBeNull()
  })
})
