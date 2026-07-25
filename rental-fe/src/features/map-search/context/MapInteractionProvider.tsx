import { useMemo, useReducer, type Dispatch } from "react"
import type { ReactNode } from "react"

import {
  createInitialMapInteractionState,
  MapInteractionContext,
  mapInteractionReducer,
  type MapInteractionAction,
  type MapInteractionContextValue,
  type MapInteractionState,
} from "./MapInteractionContext"
import type { MapPosition } from "../types"

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
  initialLineMode = false,
}: {
  children: ReactNode
  initialPosition?: MapPosition | null
  initialLineMode?: boolean
}) {
  const [state, dispatch] = useReducer(
    mapInteractionReducer,
    { initialPosition, initialLineMode },
    createInitialMapInteractionState,
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
