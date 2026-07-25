import type { ImgHTMLAttributes, ReactEventHandler, ReactNode } from "react"

import { COVER_CARD_MAX_WIDTH } from "./gallery-image-delivery"
import { ProgressiveImageFrame } from "./ProgressiveImageFrame"
import { useProgressiveImage } from "./useProgressiveImage"

export { COVER_CARD_MAX_WIDTH, COVER_CAROUSEL_MAX_WIDTH } from "./gallery-image-delivery"

export type ProgressiveCoverImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  src?: string | null
  fallback: ReactNode
  maxWidth?: number
}

export function ProgressiveCoverImage({
  src,
  alt,
  className,
  fallback,
  maxWidth = COVER_CARD_MAX_WIDTH,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  draggable = false,
  onError,
  ...imageProps
}: ProgressiveCoverImageProps) {
  const {
    delivery,
    fullImageRef,
    phase,
    animateReveal,
    handleLoad,
    handleError,
  } = useProgressiveImage({
    src,
    maxWidth,
    variant: "cover",
  })

  if (!delivery || phase === "error") {
    return fallback
  }

  const handleImageError: ReactEventHandler<HTMLImageElement> = (event) => {
    handleError()
    onError?.(event)
  }

  return (
    <ProgressiveImageFrame
      delivery={delivery}
      variant="cover"
      isLoaded={phase === "loaded"}
      animateReveal={animateReveal}
      showSpinner={false}
      fullImageRef={fullImageRef}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={draggable === true}
      onLoad={handleLoad}
      onError={handleImageError}
      imageProps={imageProps}
    />
  )
}
