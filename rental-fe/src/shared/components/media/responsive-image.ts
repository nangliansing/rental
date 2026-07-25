const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/"

export const DEFAULT_RESPONSIVE_IMAGE_WIDTHS = [320, 640, 960, 1280] as const

export function isCloudinaryImageUrl(source: string) {
  const normalizedSource = source.trim()

  return (
    normalizedSource.startsWith("https://res.cloudinary.com/") &&
    normalizedSource.includes(CLOUDINARY_UPLOAD_SEGMENT)
  )
}

export function buildCloudinaryImageUrl(source: string, width: number) {
  const normalizedSource = source.trim()
  const normalizedWidth = Math.round(width)

  if (
    !isCloudinaryImageUrl(normalizedSource) ||
    !Number.isFinite(normalizedWidth) ||
    normalizedWidth <= 0
  ) {
    return normalizedSource
  }

  return normalizedSource.replace(
    CLOUDINARY_UPLOAD_SEGMENT,
    `${CLOUDINARY_UPLOAD_SEGMENT}f_auto,q_auto,c_limit,w_${normalizedWidth}/`,
  )
}

export function buildResponsiveImageSrcSet(
  source: string,
  widths: readonly number[] = DEFAULT_RESPONSIVE_IMAGE_WIDTHS,
) {
  const normalizedSource = source.trim()
  const variants = [...new Set(widths)]
    .filter((width) => Number.isFinite(width) && width > 0)
    .sort((left, right) => left - right)
    .map((width) => [buildCloudinaryImageUrl(normalizedSource, width), width] as const)

  if (
    variants.length === 0 ||
    variants.every(([url]) => url === normalizedSource)
  ) {
    return undefined
  }

  return variants.map(([url, width]) => `${url} ${width}w`).join(", ")
}
