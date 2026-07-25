import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"

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
