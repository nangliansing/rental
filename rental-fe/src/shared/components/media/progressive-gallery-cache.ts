const MAX_CACHED_SOURCES = 100

const loadedGallerySources = new Map<string, true>()

let lockedGalleryViewport: { width: number; devicePixelRatio: number } | null =
  null

export function getLockedGalleryViewport() {
  if (!lockedGalleryViewport && typeof window !== "undefined") {
    lockedGalleryViewport = {
      width: Math.round(window.visualViewport?.width ?? window.innerWidth),
      devicePixelRatio: window.devicePixelRatio || 1,
    }
  }

  return lockedGalleryViewport ?? { width: 390, devicePixelRatio: 2 }
}

export function isGallerySourceLoaded(source: string) {
  const normalizedSource = source.trim()
  if (!normalizedSource) return false

  return loadedGallerySources.has(normalizedSource)
}

export function markGallerySourceLoaded(source: string) {
  const normalizedSource = source.trim()
  if (!normalizedSource) return

  if (loadedGallerySources.has(normalizedSource)) {
    loadedGallerySources.delete(normalizedSource)
  }

  loadedGallerySources.set(normalizedSource, true)

  while (loadedGallerySources.size > MAX_CACHED_SOURCES) {
    const oldestKey = loadedGallerySources.keys().next().value
    if (!oldestKey) break
    loadedGallerySources.delete(oldestKey)
  }
}

export function resetProgressiveGalleryCacheForTests() {
  loadedGallerySources.clear()
  lockedGalleryViewport = null
}
