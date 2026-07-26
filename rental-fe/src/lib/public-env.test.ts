import { afterEach, describe, expect, it, vi } from "vitest"

import { getSocketUrl } from "./public-env"

describe("getSocketUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the configured production socket url", () => {
    vi.stubEnv("VITE_SOCKET_URL", "https://rental-be.fly.dev")
    vi.stubEnv("DEV", false)
    vi.stubEnv("PROD", true)

    expect(getSocketUrl()).toBe("https://rental-be.fly.dev")
  })

  it("falls back to localhost during local development", () => {
    vi.stubEnv("VITE_SOCKET_URL", "")
    vi.stubEnv("DEV", true)
    vi.stubEnv("PROD", false)

    expect(getSocketUrl()).toBe("http://localhost:3000")
  })

  it("does not fall back to localhost in production builds", () => {
    vi.stubEnv("VITE_SOCKET_URL", "")
    vi.stubEnv("DEV", false)
    vi.stubEnv("PROD", true)

    expect(getSocketUrl()).toBeNull()
  })
})
