import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { SyntheticEvent } from "react"

import {
  resolveCoverImageDelivery,
  resolveGalleryImageDelivery,
  COVER_CARD_MAX_WIDTH,
} from "./gallery-image-delivery"
import { isGallerySourceLoaded, markGallerySourceLoaded } from "./progressive-gallery-cache"
import { decodeProgressiveImage } from "./progressive-image-reveal"
import { normalizeProgressiveImageSource } from "./progressive-image-source"
import { GALLERY_FULL_MAX_WIDTH } from "./responsive-image"

export type ProgressiveImageLoadPhase = "loading" | "loaded" | "error"
export type ProgressiveImageVariant = "gallery" | "cover"

type UseProgressiveImageOptions = {
  src?: string | null
  maxWidth?: number
  variant?: ProgressiveImageVariant
}

function resolveDelivery(
  source: string,
  maxWidth: number,
  variant: ProgressiveImageVariant,
) {
  return variant === "cover"
    ? resolveCoverImageDelivery(source, maxWidth)
    : resolveGalleryImageDelivery(source, maxWidth)
}

function isImageReady(image: HTMLImageElement | null, fullUrl: string) {
  return (
    Boolean(image?.complete) &&
    (image?.naturalWidth ?? 0) > 0 &&
    image?.currentSrc === fullUrl
  )
}

export function useProgressiveImage({
  src,
  maxWidth,
  variant = "gallery",
}: UseProgressiveImageOptions) {
  const normalizedSource = normalizeProgressiveImageSource(src)
  const resolvedMaxWidth =
    maxWidth ??
    (variant === "cover" ? COVER_CARD_MAX_WIDTH : GALLERY_FULL_MAX_WIDTH)

  const delivery = useMemo(
    () => resolveDelivery(normalizedSource, resolvedMaxWidth, variant),
    [normalizedSource, resolvedMaxWidth, variant],
  )

  const fullImageRef = useRef<HTMLImageElement | null>(null)
  const loadGenerationRef = useRef(0)
  const [phase, setPhase] = useState<ProgressiveImageLoadPhase>("loading")
  const [animateReveal, setAnimateReveal] = useState(true)

  const commitLoadedImage = useCallback(
    async (image: HTMLImageElement) => {
      if (!delivery) return

      const generation = loadGenerationRef.current
      await decodeProgressiveImage(image)

      if (generation !== loadGenerationRef.current) return

      markGallerySourceLoaded(delivery.fullUrl)

      setPhase("loaded")
      setAnimateReveal(false)
    },
    [delivery],
  )

  useLayoutEffect(() => {
    if (!delivery) {
      setPhase("error")
      return
    }

    loadGenerationRef.current += 1

    const image = fullImageRef.current
    const ready = isImageReady(image, delivery.fullUrl)
    const cached = isGallerySourceLoaded(delivery.fullUrl)

    if (cached && ready) {
      setPhase("loaded")
      setAnimateReveal(false)
      return
    }

    setPhase("loading")
    setAnimateReveal(!cached)

    if (ready && image) {
      void commitLoadedImage(image)
    }
  }, [commitLoadedImage, delivery])

  const handleLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      void commitLoadedImage(event.currentTarget)
    },
    [commitLoadedImage],
  )

  const handleError = useCallback(() => {
    setPhase("error")
  }, [])

  return {
    delivery,
    fullImageRef,
    phase,
    animateReveal,
    handleLoad,
    handleError,
  }
}
