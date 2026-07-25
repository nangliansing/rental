const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/"

export const DEFAULT_RESPONSIVE_IMAGE_WIDTHS = [320, 640, 960, 1280] as const
export const GALLERY_FULL_MAX_WIDTH = 1600
export const GALLERY_PLACEHOLDER_WIDTH = 48

function insertCloudinaryTransforms(source: string, transforms: string) {
  const normalizedSource = source.trim()

  if (
    !isCloudinaryImageUrl(normalizedSource) ||
    !transforms.trim()
  ) {
    return normalizedSource
  }

  return normalizedSource.replace(
    CLOUDINARY_UPLOAD_SEGMENT,
    `${CLOUDINARY_UPLOAD_SEGMENT}${transforms}/`,
  )
}

export function resolveGalleryFullWidth(
  viewportWidth: number,
  devicePixelRatio = 1,
  maxWidth = GALLERY_FULL_MAX_WIDTH,
) {
  const normalizedViewportWidth = Math.round(viewportWidth)
  const normalizedDevicePixelRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(devicePixelRatio, 1)
    : 1
  const normalizedMaxWidth = Math.round(maxWidth)

  if (
    !Number.isFinite(normalizedViewportWidth) ||
    normalizedViewportWidth <= 0 ||
    !Number.isFinite(normalizedMaxWidth) ||
    normalizedMaxWidth <= 0
  ) {
    return GALLERY_FULL_MAX_WIDTH
  }

  return Math.min(
    normalizedMaxWidth,
    Math.round(normalizedViewportWidth * normalizedDevicePixelRatio),
  )
}

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

export function buildCloudinaryPlaceholderUrl(
  source: string,
  width = GALLERY_PLACEHOLDER_WIDTH,
) {
  const normalizedWidth = Math.round(width)

  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) {
    return source.trim()
  }

  return insertCloudinaryTransforms(
    source,
    `c_limit,w_${normalizedWidth},q_10,e_blur:200,f_auto`,
  )
}
