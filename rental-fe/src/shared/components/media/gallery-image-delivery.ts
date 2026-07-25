import { getLockedGalleryViewport } from "./progressive-gallery-cache"
import { normalizeProgressiveImageSource } from "./progressive-image-source"
import {
  buildCloudinaryImageUrl,
  buildCloudinaryPlaceholderUrl,
  GALLERY_FULL_MAX_WIDTH,
  isCloudinaryImageUrl,
  resolveGalleryFullWidth,
} from "./responsive-image"

export type GalleryImageDelivery = {
  cacheKey: string
  fullUrl: string
  placeholderUrl: string | null
}

export const COVER_CARD_MAX_WIDTH = 640
export const COVER_CAROUSEL_MAX_WIDTH = 960
export const COVER_ABSOLUTE_MAX_WIDTH = COVER_CAROUSEL_MAX_WIDTH

const MIN_DELIVERY_WIDTH = 32

function normalizeDeliveryWidth(
  width: number,
  fallback: number,
  absoluteMax: number,
) {
  const rounded = Math.round(width)
  if (!Number.isFinite(rounded) || rounded < MIN_DELIVERY_WIDTH) {
    return fallback
  }

  return Math.min(rounded, absoluteMax)
}

function buildProgressiveImageDelivery(
  source: unknown,
  variant: "cover" | "gallery",
  maxWidth: number,
): GalleryImageDelivery | null {
  const cacheKey = normalizeProgressiveImageSource(source)
  if (!cacheKey) return null

  const isCloudinary = isCloudinaryImageUrl(cacheKey)
  const targetWidth =
    variant === "gallery"
      ? (() => {
          const viewport = getLockedGalleryViewport()
          return resolveGalleryFullWidth(
            viewport.width,
            viewport.devicePixelRatio,
            normalizeDeliveryWidth(
              maxWidth,
              GALLERY_FULL_MAX_WIDTH,
              GALLERY_FULL_MAX_WIDTH,
            ),
          )
        })()
      : normalizeDeliveryWidth(
          maxWidth,
          COVER_CARD_MAX_WIDTH,
          COVER_ABSOLUTE_MAX_WIDTH,
        )

  return {
    cacheKey,
    fullUrl: isCloudinary
      ? buildCloudinaryImageUrl(cacheKey, targetWidth)
      : cacheKey,
    placeholderUrl: isCloudinary
      ? buildCloudinaryPlaceholderUrl(cacheKey)
      : null,
  }
}

export function resolveCoverImageDelivery(
  source: unknown,
  maxWidth = COVER_CARD_MAX_WIDTH,
) {
  return buildProgressiveImageDelivery(source, "cover", maxWidth)
}

export function resolveGalleryImageDelivery(
  source: unknown,
  maxWidth = GALLERY_FULL_MAX_WIDTH,
) {
  return buildProgressiveImageDelivery(source, "gallery", maxWidth)
}
