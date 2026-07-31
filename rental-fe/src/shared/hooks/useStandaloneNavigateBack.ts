import { useNavigateBack } from "./useNavigateBack"

/** Browser-style back for standalone pages, falling back to home when history is empty. */
export function useStandaloneNavigateBack(fallbackPath = "/") {
  return useNavigateBack(fallbackPath)
}
