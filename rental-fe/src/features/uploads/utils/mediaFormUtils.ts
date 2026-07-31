import type { UploadedMedia } from "../api/uploadToCloudinary"

export function areMediaEqual(
  firstMedia: UploadedMedia | null,
  secondMedia: UploadedMedia | null,
) {
  if (!firstMedia && !secondMedia) return true
  if (!firstMedia || !secondMedia) return false

  return (
    firstMedia.publicId === secondMedia.publicId &&
    firstMedia.secureUrl === secondMedia.secureUrl
  )
}
