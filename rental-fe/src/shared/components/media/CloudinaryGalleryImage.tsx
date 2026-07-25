import {
  AdvancedImage,
  lazyload,
  placeholder,
  responsive,
} from "@cloudinary/react"
import { useMemo, useState } from "react"
import type { ImgHTMLAttributes, ReactNode, SyntheticEvent } from "react"

import { createCloudinaryGalleryImage } from "./cloudinary-image"

const DEFAULT_RESPONSIVE_STEPS = [640, 960, 1280, 1600] as const

const EAGER_GALLERY_PLUGINS = [
  responsive({ steps: [...DEFAULT_RESPONSIVE_STEPS] }),
  placeholder({ mode: "blur" }),
] as const

const LAZY_GALLERY_PLUGINS = [
  lazyload(),
  responsive({ steps: [...DEFAULT_RESPONSIVE_STEPS] }),
  placeholder({ mode: "blur" }),
] as const

type CloudinaryGalleryImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  src: string
  fallback: ReactNode
  eager?: boolean
  maxWidth?: number
  responsiveSteps?: readonly number[]
}

export function CloudinaryGalleryImage({
  src,
  fallback,
  eager = false,
  maxWidth = 1600,
  responsiveSteps = DEFAULT_RESPONSIVE_STEPS,
  loading,
  decoding = "async",
  onError,
  ...imageProps
}: CloudinaryGalleryImageProps) {
  const [failed, setFailed] = useState(false)

  const cldImg = useMemo(
    () => createCloudinaryGalleryImage(src, maxWidth),
    [maxWidth, src],
  )

  const plugins = useMemo(() => {
    if (responsiveSteps === DEFAULT_RESPONSIVE_STEPS) {
      return eager ? EAGER_GALLERY_PLUGINS : LAZY_GALLERY_PLUGINS
    }

    const responsivePlugin = responsive({ steps: [...responsiveSteps] })

    return eager
      ? [responsivePlugin, placeholder({ mode: "blur" })]
      : [lazyload(), responsivePlugin, placeholder({ mode: "blur" })]
  }, [eager, responsiveSteps])

  if (failed || !cldImg) {
    return fallback
  }

  return (
    <AdvancedImage
      {...imageProps}
      cldImg={cldImg}
      plugins={[...plugins]}
      loading={loading ?? (eager ? "eager" : "lazy")}
      decoding={decoding}
      onError={(event: SyntheticEvent<HTMLImageElement, Event>) => {
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}
