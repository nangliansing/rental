import { describe, expect, it, vi } from "vitest"

describe("getListerProfileUrl", () => {
  it("returns a relative path when window is unavailable", async () => {
    vi.stubGlobal("window", undefined)

    vi.resetModules()
    const { getListerProfileUrl } = await import("./listerProfileUrl")

    expect(getListerProfileUrl("agent-1")).toBe("/listers/agent-1")

    vi.unstubAllGlobals()
  })

  it("returns an absolute URL in the browser", async () => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    })

    vi.resetModules()
    const { getListerProfileUrl } = await import("./listerProfileUrl")

    expect(getListerProfileUrl("agent-1")).toBe(
      "http://localhost:5173/listers/agent-1",
    )

    vi.unstubAllGlobals()
  })
})
