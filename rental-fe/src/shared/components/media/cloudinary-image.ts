import { isCloudinaryImageUrl } from "./responsive-image"

export type ParsedCloudinaryDeliveryUrl = {
  cloudName: string
  publicId: string
  version?: number
}

const CLOUDINARY_DELIVERY_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/(upload|fetch|private|authenticated)\/(.+)$/i

function isTransformSegment(segment: string) {
  if (!segment || segment.includes(",")) return Boolean(segment?.includes(","))
  if (/^v\d+$/.test(segment)) return false
  if (/^https?:/.test(segment)) return false

  return /^[a-z0-9]+_[\w.-]+$/i.test(segment) || /^[a-z0-9]+:[\w.-]+$/i.test(segment)
}

export function parseCloudinaryDeliveryUrl(
  source: string,
): ParsedCloudinaryDeliveryUrl | null {
  const normalizedSource = source.trim()
  if (!isCloudinaryImageUrl(normalizedSource)) return null

  const match = normalizedSource.match(CLOUDINARY_DELIVERY_URL_PATTERN)
  if (!match) return null

  const [, cloudName, , remainder] = match
  const parts = remainder.split("/")
  let index = 0

  while (index < parts.length && isTransformSegment(parts[index]!)) {
    index += 1
  }

  let version: number | undefined
  if (index < parts.length && /^v\d+$/.test(parts[index]!)) {
    version = Number.parseInt(parts[index]!.slice(1), 10)
    index += 1
  }

  const publicId = parts.slice(index).join("/")
  if (!publicId) return null

  return {
    cloudName,
    publicId,
    version: Number.isFinite(version) ? version : undefined,
  }
}
