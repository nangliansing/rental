import type { MapPosition } from "../types"

const METERS_PER_DEGREE_LATITUDE = 111_320

export function buildLineCoveragePolygon(
  points: MapPosition[],
  distanceMeters: number,
): MapPosition[] {
  if (points.length < 2 || distanceMeters <= 0) return []

  const referenceLatitude =
    points.reduce((total, point) => total + point.lat, 0) / points.length
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.cos((referenceLatitude * Math.PI) / 180)
  if (Math.abs(metersPerDegreeLongitude) < 1) return []

  const xy = points.map((point) => ({
    x: point.lng * metersPerDegreeLongitude,
    y: point.lat * METERS_PER_DEGREE_LATITUDE,
  }))
  const normals = xy.slice(0, -1).map((point, index) => {
    const next = xy[index + 1]
    const dx = next.x - point.x
    const dy = next.y - point.y
    const length = Math.hypot(dx, dy)
    return length > 0 ? { x: -dy / length, y: dx / length } : { x: 0, y: 0 }
  })

  const offsetPoint = (index: number, side: 1 | -1) => {
    const before = normals[Math.max(0, index - 1)]
    const after = normals[Math.min(normals.length - 1, index)]
    let nx = before.x + after.x
    let ny = before.y + after.y
    const normalLength = Math.hypot(nx, ny)
    if (normalLength === 0) {
      nx = after.x
      ny = after.y
    } else {
      nx /= normalLength
      ny /= normalLength
    }
    const alignment = Math.max(0.35, Math.abs(nx * after.x + ny * after.y))
    const offset = Math.min(distanceMeters / alignment, distanceMeters * 2)

    return {
      lat: (xy[index].y + side * ny * offset) / METERS_PER_DEGREE_LATITUDE,
      lng: (xy[index].x + side * nx * offset) / metersPerDegreeLongitude,
    }
  }

  const left = points.map((_, index) => offsetPoint(index, 1))
  const right = points.map((_, index) => offsetPoint(index, -1)).reverse()
  return [...left, ...right]
}
