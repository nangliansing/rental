import type { ReactNode } from "react"

/** True when a ReactNode should be treated as present content (labels, errors, etc.). */
export function hasReactNodeContent(value: ReactNode) {
  return value !== null && value !== undefined && value !== false && value !== ""
}
