import { normalizeProgressiveImageSource } from "./progressive-image-source"
import {
  buildCloudinaryImageUrl,
  buildCloudinaryPlaceholderUrl,
  buildResponsiveImageSrcSet,
  isCloudinaryImageUrl,
} from "./responsive-image"

/** Widths tuned for 2–3 column square grid cells (~180–430px display). */
export const GRID_COVER_RESPONSIVE_WIDTHS = [240, 320, 480] as const

/** Tiny LQIP width for Pinterest-style blur-up on grid tiles. */
export const GRID_COVER_PLACEHOLDER_WIDTH = 32

/** Matches the listing grid column layout: 50vw mobile, 33vw from sm breakpoint. */
export const GRID_COVER_SIZES = "(min-width: 640px) 33vw, 50vw"

/** Short fade when the sharp grid cover replaces the blur. */
export const GRID_COVER_REVEAL_MS = 150

export type GridCoverImageDelivery = {
  cacheKey: string
  src: string
  srcSet: string | undefined
  /** Tiny blurred Cloudinary preview; omitted when a dominant color is used instead. */
  placeholderUrl: string | null
}

export function resolveGridCoverImageDelivery(
  source: unknown,
  options?: {
    widths?: readonly number[]
    useBlurPlaceholder?: boolean
  },
): GridCoverImageDelivery | null {
  const cacheKey = normalizeProgressiveImageSource(source)
  if (!cacheKey) return null

  const widths = options?.widths ?? GRID_COVER_RESPONSIVE_WIDTHS
  const useBlurPlaceholder = options?.useBlurPlaceholder ?? true
  const normalizedWidths = [...widths].filter(
    (width) => Number.isFinite(width) && width > 0,
  )
  const largestWidth = normalizedWidths.length
    ? Math.max(...normalizedWidths)
    : GRID_COVER_RESPONSIVE_WIDTHS.at(-1)!

  const isCloudinary = isCloudinaryImageUrl(cacheKey)
  const src = isCloudinary
    ? buildCloudinaryImageUrl(cacheKey, largestWidth)
    : cacheKey

  return {
    cacheKey,
    src,
    srcSet: buildResponsiveImageSrcSet(cacheKey, normalizedWidths),
    placeholderUrl:
      isCloudinary && useBlurPlaceholder
        ? buildCloudinaryPlaceholderUrl(
            cacheKey,
            GRID_COVER_PLACEHOLDER_WIDTH,
          )
        : null,
  }
}
