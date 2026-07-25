import { useEffect } from "react"
import { useLocation } from "react-router-dom"

import { getRouteTitle } from "./route-title"

const APP_NAME = "Rental"

export function RouteAccessibility() {
  const { pathname } = useLocation()
  const routeTitle = getRouteTitle(pathname)

  useEffect(() => {
    document.title = `${routeTitle} | ${APP_NAME}`
  }, [routeTitle])

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {routeTitle}
    </p>
  )
}
