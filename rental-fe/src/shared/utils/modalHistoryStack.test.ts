import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  __resetModalHistoryStackForTests,
  isTopStackEntry,
  registerStackEntry,
  requestStackClose,
} from "./modalHistoryStack"

describe("modalHistoryStack", () => {
  beforeEach(() => {
    __resetModalHistoryStackForTests()
  })

  afterEach(() => {
    __resetModalHistoryStackForTests()
  })

  it("pushes history when registering a tracked entry", () => {
    const pushState = vi.spyOn(window.history, "pushState")
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose: vi.fn(),
      tracksHistory: true,
    })

    expect(pushState).toHaveBeenCalledOnce()
    expect(isTopStackEntry(token)).toBe(true)
  })

  it("closes the top tracked entry on browser back", () => {
    const onClose = vi.fn()
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose,
      tracksHistory: true,
    })

    window.dispatchEvent(new PopStateEvent("popstate"))

    expect(onClose).toHaveBeenCalledOnce()
    expect(isTopStackEntry(token)).toBe(false)
  })

  it("closes nested overlays from the top down", () => {
    const onCloseOuter = vi.fn()
    const onCloseInner = vi.fn()

    registerStackEntry({
      token: Symbol("outer"),
      onClose: onCloseOuter,
      tracksHistory: true,
    })
    registerStackEntry({
      token: Symbol("inner"),
      onClose: onCloseInner,
      tracksHistory: true,
    })

    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(onCloseInner).toHaveBeenCalledOnce()
    expect(onCloseOuter).not.toHaveBeenCalled()

    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(onCloseOuter).toHaveBeenCalledOnce()
  })

  it("syncs history when closing programmatically", () => {
    const back = vi.spyOn(window.history, "back")
    const onClose = vi.fn()
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose,
      tracksHistory: true,
    })

    requestStackClose(token)

    expect(onClose).toHaveBeenCalledOnce()
    expect(back).toHaveBeenCalledOnce()
    expect(isTopStackEntry(token)).toBe(false)
  })

  it("ignores popstate triggered by programmatic history sync", () => {
    const onClose = vi.fn()
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose,
      tracksHistory: true,
    })

    requestStackClose(token)
    window.dispatchEvent(new PopStateEvent("popstate"))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("does not history.back when the modal entry was replaced", () => {
    const back = vi.spyOn(window.history, "back")
    const onClose = vi.fn()
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose,
      tracksHistory: true,
    })

    window.history.replaceState({ replaced: true }, "")

    requestStackClose(token)

    expect(onClose).toHaveBeenCalledOnce()
    expect(back).not.toHaveBeenCalled()
    expect(isTopStackEntry(token)).toBe(false)
  })
})
