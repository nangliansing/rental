import { createContext, useContext } from "react"

import type { MapPosition } from "../types"
import { isValidMapPosition } from "../utils/map-position"

export type MapSearchMode = "area" | "pin" | "line"
export type MapPinSource = "manual" | "current-location" | null

export type MapInteractionState = {
  mode: MapSearchMode
  selectedPin: MapPosition | null
  currentLocation: MapPosition | null
  pinSource: MapPinSource
}

export type MapInteractionAction =
  | { type: "enterManualPin"; position: MapPosition }
  | { type: "enterCurrentLocation"; position: MapPosition }
  | { type: "movePin"; position: MapPosition }
  | { type: "enterLineMode" }
  | { type: "exitLineMode" }
  | { type: "exitPinMode" }

export const initialMapInteractionState: MapInteractionState = {
  mode: "area",
  selectedPin: null,
  currentLocation: null,
  pinSource: null,
}

export function mapInteractionReducer(
  state: MapInteractionState,
  action: MapInteractionAction,
): MapInteractionState {
  switch (action.type) {
    case "enterManualPin":
      if (!isValidMapPosition(action.position)) return state
      return {
        mode: "pin",
        selectedPin: action.position,
        currentLocation: null,
        pinSource: "manual",
      }
    case "enterCurrentLocation":
      if (!isValidMapPosition(action.position)) return state
      return {
        mode: "pin",
        selectedPin: action.position,
        currentLocation: action.position,
        pinSource: "current-location",
      }
    case "movePin":
      if (state.mode !== "pin" || !isValidMapPosition(action.position)) {
        return state
      }
      return {
        ...state,
        selectedPin: action.position,
        currentLocation: null,
        pinSource: "manual",
      }
    case "enterLineMode":
      return {
        mode: "line",
        selectedPin: null,
        currentLocation: null,
        pinSource: null,
      }
    case "exitLineMode":
      return initialMapInteractionState
    case "exitPinMode":
      return initialMapInteractionState
  }
}

export type MapInteractionContextValue = MapInteractionState & {
  enterManualPinMode: (position: MapPosition) => void
  enterCurrentLocationMode: (position: MapPosition) => void
  movePin: (position: MapPosition) => void
  enterLineMode: () => void
  exitLineMode: () => void
  exitPinMode: () => void
}

export const MapInteractionContext =
  createContext<MapInteractionContextValue | null>(null)

export function useMapInteraction() {
  const context = useContext(MapInteractionContext)
  if (!context) {
    throw new Error(
      "useMapInteraction must be used within MapInteractionProvider",
    )
  }
  return context
}
