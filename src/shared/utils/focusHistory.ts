let trackedFocus: HTMLElement | null = null
let previousTrackedFocus: HTMLElement | null = null
let isFocusTrackingInstalled = false

export function ensureFocusTracking() {
  if (isFocusTrackingInstalled || typeof document === "undefined") return

  trackedFocus = document.activeElement as HTMLElement | null
  document.addEventListener("focusin", (event) => {
    const nextFocus = event.target as HTMLElement | null
    if (nextFocus === trackedFocus) return

    previousTrackedFocus = trackedFocus
    trackedFocus = nextFocus
  })
  isFocusTrackingInstalled = true
}

export function getFocusRestoreTarget(container: HTMLElement | null) {
  const activeElement = document.activeElement as HTMLElement | null
  return container?.contains(activeElement) ? previousTrackedFocus : activeElement
}
