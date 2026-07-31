import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * Browser-style back navigation: go back one history entry when possible,
 * otherwise navigate to the fallback path (home by default on standalone pages).
 */
export function useNavigateBack(fallbackPath = "/") {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    if (location.key !== "default") {
      navigate(-1)
      return
    }

    navigate(fallbackPath)
  }, [fallbackPath, location.key, navigate])
}
