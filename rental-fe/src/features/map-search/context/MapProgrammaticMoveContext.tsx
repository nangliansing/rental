import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react"

type MapProgrammaticMoveContextValue = {
  beginProgrammaticMove: () => void
  isProgrammaticCameraMove: () => boolean
  endProgrammaticMove: () => void
}

const MapProgrammaticMoveContext =
  createContext<MapProgrammaticMoveContextValue | null>(null)

const noopContextValue: MapProgrammaticMoveContextValue = {
  beginProgrammaticMove: () => {},
  isProgrammaticCameraMove: () => false,
  endProgrammaticMove: () => {},
}

export function MapProgrammaticMoveProvider({
  children,
}: {
  children: ReactNode
}) {
  const isProgrammaticMoveRef = useRef(false)

  const beginProgrammaticMove = useCallback(() => {
    isProgrammaticMoveRef.current = true
  }, [])

  const isProgrammaticCameraMove = useCallback(
    () => isProgrammaticMoveRef.current,
    [],
  )

  const endProgrammaticMove = useCallback(() => {
    isProgrammaticMoveRef.current = false
  }, [])

  const value = useMemo(
    () => ({
      beginProgrammaticMove,
      isProgrammaticCameraMove,
      endProgrammaticMove,
    }),
    [beginProgrammaticMove, endProgrammaticMove, isProgrammaticCameraMove],
  )

  return (
    <MapProgrammaticMoveContext.Provider value={value}>
      {children}
    </MapProgrammaticMoveContext.Provider>
  )
}

export function useMapProgrammaticMove() {
  return useContext(MapProgrammaticMoveContext) ?? noopContextValue
}
