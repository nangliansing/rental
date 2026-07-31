import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  __resetModalHistoryStackForTests,
  dismissModalHistoryEntryIfActive,
  isTopStackEntry,
  registerStackEntry,
  requestStackClose,
  unregisterStackEntry,
} from "./modalHistoryStack"

describe("modalHistoryStack", () => {
  beforeEach(() => {
    __resetModalHistoryStackForTests()
    window.history.replaceState({}, "")
  })

  afterEach(() => {
    __resetModalHistoryStackForTests()
    window.history.replaceState({}, "")
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

  it("hands off modal history from preview to detail without history.back", () => {
    const pushState = vi.spyOn(window.history, "pushState")
    const back = vi.spyOn(window.history, "back")
    const onClosePreview = vi.fn()
    const onCloseDetail = vi.fn()
    const previewToken = Symbol("preview")
    const detailToken = Symbol("detail")

    registerStackEntry({
      token: previewToken,
      onClose: onClosePreview,
      tracksHistory: true,
    })

    expect(pushState).toHaveBeenCalledOnce()

    unregisterStackEntry(previewToken, { syncHistory: false })
    expect(back).not.toHaveBeenCalled()
    expect(isTopStackEntry(previewToken)).toBe(false)

    pushState.mockClear()

    registerStackEntry({
      token: detailToken,
      onClose: onCloseDetail,
      tracksHistory: true,
    })

    expect(pushState).not.toHaveBeenCalled()
    expect(isTopStackEntry(detailToken)).toBe(true)

    window.dispatchEvent(new PopStateEvent("popstate"))

    expect(onCloseDetail).toHaveBeenCalledOnce()
    expect(onClosePreview).not.toHaveBeenCalled()
  })

  it("still pushes history for nested tracked modals", () => {
    const pushState = vi.spyOn(window.history, "pushState")

    registerStackEntry({
      token: Symbol("outer"),
      onClose: vi.fn(),
      tracksHistory: true,
    })

    pushState.mockClear()

    registerStackEntry({
      token: Symbol("inner"),
      onClose: vi.fn(),
      tracksHistory: true,
    })

    expect(pushState).toHaveBeenCalledOnce()
  })

  it("syncs history when unregistering a tracked entry normally", () => {
    const back = vi.spyOn(window.history, "back")
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose: vi.fn(),
      tracksHistory: true,
    })

    unregisterStackEntry(token)

    expect(back).toHaveBeenCalledOnce()
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

  it("dismisses an active modal history entry without invoking stack onClose", () => {
    const back = vi.spyOn(window.history, "back")
    const onClose = vi.fn()
    const token = Symbol("modal")

    registerStackEntry({
      token,
      onClose,
      tracksHistory: true,
    })

    unregisterStackEntry(token, { syncHistory: false })
    back.mockClear()
    onClose.mockClear()

    dismissModalHistoryEntryIfActive()

    expect(back).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()

    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(onClose).not.toHaveBeenCalled()
  })
})
