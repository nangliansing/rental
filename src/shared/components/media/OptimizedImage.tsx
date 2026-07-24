import { useState } from "react"
import type { ImgHTMLAttributes, ReactNode } from "react"

import {
  buildCloudinaryImageUrl,
  buildResponsiveImageSrcSet,
  DEFAULT_RESPONSIVE_IMAGE_WIDTHS,
} from "./responsive-image"

type OptimizedImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  src?: string | null
  fallback: ReactNode
  responsiveWidths?: readonly number[]
}

export function OptimizedImage({
  src,
  fallback,
  responsiveWidths = DEFAULT_RESPONSIVE_IMAGE_WIDTHS,
  loading = "lazy",
  decoding = "async",
  onError,
  ...imageProps
}: OptimizedImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const normalizedSource = typeof src === "string" ? src.trim() : ""

  if (!normalizedSource || failedSource === normalizedSource) return fallback

  const largestWidth = Math.max(...responsiveWidths)
  const optimizedSource = Number.isFinite(largestWidth)
    ? buildCloudinaryImageUrl(normalizedSource, largestWidth)
    : normalizedSource

  return (
    <img
      {...imageProps}
      src={optimizedSource}
      srcSet={buildResponsiveImageSrcSet(normalizedSource, responsiveWidths)}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        setFailedSource(normalizedSource)
        onError?.(event)
      }}
    />
  )
}
