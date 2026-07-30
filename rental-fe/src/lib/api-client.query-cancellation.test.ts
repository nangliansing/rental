import { afterEach, describe, expect, it, vi } from "vitest"

import { apiClient } from "./api-client"

describe("apiClient GET cancellation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("forwards the options AbortSignal to fetch", async () => {
    const controller = new AbortController()
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await apiClient.get("/signal-test", { signal: controller.signal })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/signal-test",
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it("preserves the legacy retry-and-signal signature", async () => {
    const controller = new AbortController()
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await apiClient.get("/legacy-signal-test", true, controller.signal)

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/legacy-signal-test",
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it("rejects the request when the supplied signal is aborted", async () => {
    const controller = new AbortController()

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal

        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"))
          return
        }

        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        )
      })
    })

    const request = apiClient.get("/abort-test", {
      signal: controller.signal,
    })
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: "AbortError" })
  })
})
