import { ImageIcon } from "lucide-react"
import { memo, useState } from "react"

import { cn } from "@/lib/utils"
import { COVER_CARD_MAX_WIDTH } from "@/shared/components/media/gallery-image-delivery"
import {
  buildCloudinaryImageUrl,
  isCloudinaryImageUrl,
} from "@/shared/components/media/responsive-image"

export type ListingGridCoverImageProps = {
  src?: string | null
  alt: string
  className?: string
  fallbackClassName?: string
}

function normalizeImageSource(src?: string | null) {
  return typeof src === "string" ? src.trim() : ""
}

function resolveGridCoverSrc(source: string) {
  if (!source) return ""

  if (isCloudinaryImageUrl(source)) {
    return buildCloudinaryImageUrl(source, COVER_CARD_MAX_WIDTH)
  }

  return source
}

export const ListingGridCoverImage = memo(function ListingGridCoverImage({
  src,
  alt,
  className,
  fallbackClassName,
}: ListingGridCoverImageProps) {
  const normalizedSource = normalizeImageSource(src)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const optimizedSource = resolveGridCoverSrc(normalizedSource)

  if (!optimizedSource || failedSource === normalizedSource) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-200",
          fallbackClassName,
        )}
      >
        <ImageIcon aria-hidden="true" className="h-8 w-8 text-current" />
      </div>
    )
  }

  return (
    <img
      src={optimizedSource}
      alt={alt}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      draggable={false}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailedSource(normalizedSource)}
    />
  )
})
