import { resolveGalleryImageDelivery } from "./gallery-image-delivery"
import { decodeProgressiveImage } from "./progressive-image-reveal"
import { isGallerySourceLoaded, markGallerySourceLoaded } from "./progressive-gallery-cache"
import { GALLERY_FULL_MAX_WIDTH } from "./responsive-image"

const prefetchRequests = new Map<string, Promise<void>>()

export function prefetchProgressiveGalleryImage(
  source: unknown,
  maxWidth = GALLERY_FULL_MAX_WIDTH,
) {
  const delivery = resolveGalleryImageDelivery(source, maxWidth)
  if (!delivery) return Promise.resolve()

  const { fullUrl } = delivery
  if (isGallerySourceLoaded(fullUrl)) return Promise.resolve()

  const inFlight = prefetchRequests.get(fullUrl)
  if (inFlight) return inFlight

  const request = new Promise<void>((resolve) => {
    const image = new Image()

    const finish = () => {
      prefetchRequests.delete(fullUrl)
      resolve()
    }

    image.onload = async () => {
      await decodeProgressiveImage(image)
      markGallerySourceLoaded(fullUrl)
      finish()
    }

    image.onerror = finish
    image.src = fullUrl
  })

  prefetchRequests.set(fullUrl, request)
  return request
}

export function resetProgressiveGalleryPrefetchForTests() {
  prefetchRequests.clear()
}
