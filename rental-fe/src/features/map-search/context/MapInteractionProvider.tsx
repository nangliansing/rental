import { useMemo, useReducer, type Dispatch } from "react"
import type { ReactNode } from "react"

import {
  initialMapInteractionState,
  MapInteractionContext,
  mapInteractionReducer,
  type MapInteractionAction,
  type MapInteractionContextValue,
  type MapInteractionState,
} from "./MapInteractionContext"
import type { MapPosition } from "../types"
import { isValidMapPosition } from "../utils/map-position"

function createMapInteractionActions(
  dispatch: Dispatch<MapInteractionAction>,
): Omit<MapInteractionContextValue, keyof MapInteractionState> {
  return {
    enterManualPinMode: (position) =>
      dispatch({ type: "enterManualPin", position }),
    enterCurrentLocationMode: (position) =>
      dispatch({ type: "enterCurrentLocation", position }),
    movePin: (position) => dispatch({ type: "movePin", position }),
    enterLineMode: () => dispatch({ type: "enterLineMode" }),
    exitLineMode: () => dispatch({ type: "exitLineMode" }),
    exitPinMode: () => dispatch({ type: "exitPinMode" }),
  }
}

export function MapInteractionProvider({
  children,
  initialPosition = null,
}: {
  children: ReactNode
  initialPosition?: MapPosition | null
}) {
  const [state, dispatch] = useReducer(
    mapInteractionReducer,
    initialPosition,
    (position) =>
      isValidMapPosition(position)
        ? {
            mode: "pin" as const,
            selectedPin: position,
            currentLocation: null,
            pinSource: "manual" as const,
          }
        : initialMapInteractionState,
  )

  const actions = useMemo(() => createMapInteractionActions(dispatch), [])
  const value = useMemo<MapInteractionContextValue>(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state],
  )

  return (
    <MapInteractionContext.Provider value={value}>
      {children}
    </MapInteractionContext.Provider>
  )
}
