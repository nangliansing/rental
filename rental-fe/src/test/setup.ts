import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest"

import { server } from "./server"

vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-google-maps-api-key")
vi.stubEnv("VITE_GOOGLE_MAPS_MAP_ID", "test-google-maps-map-id")

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

beforeEach(() => {
  if (document.getElementById("modal")) return

  const modalRoot = document.createElement("div")
  modalRoot.id = "modal"
  document.body.appendChild(modalRoot)
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  document.getElementById("modal")?.replaceChildren()
})

afterAll(() => server.close())

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock)

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
})
