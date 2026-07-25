import { useCallback, useMemo, useSyncExternalStore } from "react"

export function useMediaQuery(query: string) {
  const mediaQuery = useMemo(() => window.matchMedia(query), [query])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      mediaQuery.addEventListener("change", onStoreChange)

      return () => mediaQuery.removeEventListener("change", onStoreChange)
    },
    [mediaQuery],
  )

  const getSnapshot = useCallback(() => mediaQuery.matches, [mediaQuery])
  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
