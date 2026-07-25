import type { ListingMedia } from "@/features/map-search/types"
import { PhotoViewer } from "@/shared/components/media/PhotoViewer"

type ListingPhotoViewerProps = {
  photos?: ListingMedia[] | null
  initialIndex?: number
  onClose: () => void
}

export function ListingPhotoViewer({
  photos,
  initialIndex = 0,
  onClose,
}: ListingPhotoViewerProps) {
  const viewerPhotos = Array.isArray(photos)
    ? photos.map((photo, index) => ({
        id: typeof photo?.publicId === "string" ? photo.publicId : `photo-${index}`,
        src: typeof photo?.secureUrl === "string" ? photo.secureUrl : "",
        alt: typeof photo?.alt === "string" ? photo.alt : null,
      }))
    : []

  return (
    <PhotoViewer
      photos={viewerPhotos}
      initialIndex={initialIndex}
      onClose={onClose}
      title="Listing photos"
    />
  )
}
