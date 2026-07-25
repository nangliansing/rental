import type { ImgHTMLAttributes, ReactEventHandler, ReactNode } from "react"

import { ProgressiveImageFrame } from "./ProgressiveImageFrame"
import { GALLERY_FULL_MAX_WIDTH } from "./responsive-image"
import { useProgressiveImage } from "./useProgressiveImage"

type ProgressiveGalleryImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  src?: string | null
  fallback: ReactNode
  eager?: boolean
  maxWidth?: number
}

export function ProgressiveGalleryImage({
  src,
  alt,
  className,
  fallback,
  eager = false,
  maxWidth = GALLERY_FULL_MAX_WIDTH,
  loading,
  decoding = "async",
  fetchPriority,
  draggable = false,
  onError,
  ...imageProps
}: ProgressiveGalleryImageProps) {
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
    variant: "gallery",
  })

  if (!delivery || phase === "error") {
    return fallback
  }

  const isLoaded = phase === "loaded"

  const handleImageError: ReactEventHandler<HTMLImageElement> = (event) => {
    handleError()
    onError?.(event)
  }

  return (
    <ProgressiveImageFrame
      delivery={delivery}
      variant="gallery"
      isLoaded={isLoaded}
      animateReveal={animateReveal}
      showSpinner={!isLoaded}
      fullImageRef={fullImageRef}
      alt={alt}
      className={className}
      loading={loading ?? (eager ? "eager" : "lazy")}
      decoding={decoding}
      fetchPriority={fetchPriority ?? (eager ? "high" : "low")}
      draggable={draggable === true}
      onLoad={handleLoad}
      onError={handleImageError}
      imageProps={imageProps}
    />
  )
}

export {
  resetProgressiveGalleryCacheForTests,
} from "./progressive-gallery-cache"

export { resetProgressiveGalleryPrefetchForTests } from "./prefetch-progressive-gallery-image"
