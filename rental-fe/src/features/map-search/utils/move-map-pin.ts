import type { MapPosition } from "../types"

const PIN_KEYBOARD_STEP_DEGREES = 0.0005
const SHIFT_STEP_MULTIPLIER = 5

export type PinMovementKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"

export function getKeyboardMovedPin(
  position: MapPosition,
  key: string,
  shiftKey = false,
): MapPosition | null {
  const step =
    PIN_KEYBOARD_STEP_DEGREES * (shiftKey ? SHIFT_STEP_MULTIPLIER : 1)

  switch (key as PinMovementKey) {
    case "ArrowUp":
      return { ...position, lat: Math.min(90, position.lat + step) }
    case "ArrowDown":
      return { ...position, lat: Math.max(-90, position.lat - step) }
    case "ArrowLeft":
      return { ...position, lng: position.lng - step }
    case "ArrowRight":
      return { ...position, lng: position.lng + step }
    default:
      return null
  }
}
