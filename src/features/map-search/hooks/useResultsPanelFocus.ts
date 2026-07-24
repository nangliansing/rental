import { useEffect, useRef } from "react"

export type ResultsPanelPage = "results" | "buildingDetail" | "filters"
export type ResultsPanelSurface = "mobile" | "desktop"

type UseResultsPanelFocusInput = {
  activePage: ResultsPanelPage
  isDesktop: boolean
}

export function useResultsPanelFocus({
  activePage,
  isDesktop,
}: UseResultsPanelFocusInput) {
  const mobilePageHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const desktopPageHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const mobileFilterTriggerRef = useRef<HTMLButtonElement | null>(null)
  const desktopFilterTriggerRef = useRef<HTMLButtonElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const returnBuildingIdRef = useRef<string | null>(null)
  const returnSurfaceRef = useRef<ResultsPanelSurface>(
    isDesktop ? "desktop" : "mobile",
  )
  const shouldFocusPageRef = useRef(false)
  const shouldRestoreFocusRef = useRef(false)

  useEffect(() => {
    returnSurfaceRef.current = isDesktop ? "desktop" : "mobile"
  }, [isDesktop])

  useEffect(() => {
    if (!shouldFocusPageRef.current && !shouldRestoreFocusRef.current) return

    const frame = window.requestAnimationFrame(() => {
      if (shouldRestoreFocusRef.current) {
        shouldRestoreFocusRef.current = false
        const savedTarget = returnFocusRef.current
        const buildingId = returnBuildingIdRef.current
        const surface = returnSurfaceRef.current
        const filterTrigger =
          surface === "desktop"
            ? desktopFilterTriggerRef.current
            : mobileFilterTriggerRef.current
        const fallback = buildingId
          ? document.querySelector<HTMLElement>(
              `[data-building-trigger="${buildingId}"]`,
            )
          : filterTrigger

        if (savedTarget?.isConnected) savedTarget.focus()
        else fallback?.focus()
        return
      }

      shouldFocusPageRef.current = false
      ;(isDesktop
        ? desktopPageHeadingRef.current
        : mobilePageHeadingRef.current
      )?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activePage, isDesktop])

  const captureReturnFocus = (buildingId: string | null = null) => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    returnBuildingIdRef.current = buildingId
    returnSurfaceRef.current = isDesktop ? "desktop" : "mobile"
  }

  const focusPage = () => {
    shouldFocusPageRef.current = true
  }

  const restoreFocus = () => {
    shouldRestoreFocusRef.current = true
  }

  return {
    mobilePageHeadingRef,
    desktopPageHeadingRef,
    mobileFilterTriggerRef,
    desktopFilterTriggerRef,
    captureReturnFocus,
    focusPage,
    restoreFocus,
  }
}
