import { useState } from "react"
import type { ReactNode, SyntheticEvent } from "react"

import { cn } from "@/lib/utils"
import { OptimizedImage } from "./OptimizedImage"
import { isCloudinaryImageUrl } from "./responsive-image"

const PREVIEW_WIDTH = 96
const FULL_IMAGE_WIDTHS = [640, 960, 1280, 1600] as const

type ProgressiveImageProps = {
  src: string
  alt: string
  className?: string
  fallback: ReactNode
}

export function ProgressiveImage({
  src,
  alt,
  className,
  fallback,
}: ProgressiveImageProps) {
  const normalizedSource = src.trim()
  const [decodedSource, setDecodedSource] = useState<string | null>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const isDecoded = decodedSource === normalizedSource
  const hasFailed = failedSource === normalizedSource
  const supportsPreview = isCloudinaryImageUrl(normalizedSource)

  const revealAfterDecode = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const loadedSource = normalizedSource
    const reveal = () => setDecodedSource(loadedSource)

    if (typeof image.decode !== "function") {
      reveal()
      return
    }

    void image.decode().catch(() => undefined).then(reveal)
  }

  if (!supportsPreview) {
    return (
      <OptimizedImage
        src={normalizedSource}
        alt={alt}
        className={className}
        width={1600}
        height={1200}
        sizes="100vw"
        responsiveWidths={FULL_IMAGE_WIDTHS}
        loading="eager"
        fetchPriority="high"
        draggable={false}
        fallback={fallback}
      />
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <OptimizedImage
        src={normalizedSource}
        alt=""
        aria-hidden="true"
        className={cn(
          className,
          "absolute inset-0 scale-[1.015] blur-md transition-opacity duration-500 ease-out motion-reduce:scale-100 motion-reduce:blur-none motion-reduce:transition-none",
          isDecoded || hasFailed ? "opacity-0" : "opacity-100",
        )}
        width={PREVIEW_WIDTH}
        height={72}
        sizes={`${PREVIEW_WIDTH}px`}
        responsiveWidths={[PREVIEW_WIDTH]}
        loading="eager"
        fetchPriority="high"
        draggable={false}
        fallback={null}
      />

      <OptimizedImage
        src={normalizedSource}
        alt={alt}
        className={cn(
          className,
          "absolute inset-0 transition-opacity duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          isDecoded ? "opacity-100" : "opacity-0",
        )}
        width={1600}
        height={1200}
        sizes="100vw"
        responsiveWidths={FULL_IMAGE_WIDTHS}
        loading="eager"
        fetchPriority="high"
        draggable={false}
        onLoad={revealAfterDecode}
        onError={() => setFailedSource(normalizedSource)}
        fallback={fallback}
      />
    </div>
  )
}
