import { describe, expect, it, vi } from "vitest"

import {
  isElementVisibleInScrollContainer,
  resolveScrollContainer,
  scrollElementIntoViewIfNeeded,
} from "./scrollElementIntoViewIfNeeded"

function createRect(top: number, bottom: number) {
  return {
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

function createScrollContainer({
  scrollTop = 0,
  scrollHeight = 500,
  clientHeight = 200,
  top = 0,
  bottom = 200,
}: {
  scrollTop?: number
  scrollHeight?: number
  clientHeight?: number
  top?: number
  bottom?: number
}) {
  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    parentElement: null,
    getBoundingClientRect: () => createRect(top, bottom),
    scrollTo: vi.fn(),
  } as unknown as HTMLElement
}

describe("scrollElementIntoViewIfNeeded", () => {
  it("detects when an element is fully visible in the container", () => {
    const container = {
      getBoundingClientRect: () => createRect(0, 200),
    } as HTMLElement
    const element = {
      getBoundingClientRect: () => createRect(20, 80),
    } as HTMLElement

    expect(isElementVisibleInScrollContainer(element, container)).toBe(true)
  })

  it("detects when an element is outside the container", () => {
    const container = {
      getBoundingClientRect: () => createRect(0, 200),
    } as HTMLElement
    const element = {
      getBoundingClientRect: () => createRect(220, 260),
    } as HTMLElement

    expect(isElementVisibleInScrollContainer(element, container)).toBe(false)
  })

  it("prefers a scrollable ancestor when the preferred container is not scrollable", () => {
    const ancestor = document.createElement("div")
    Object.assign(ancestor.style, { overflowY: "auto" })
    Object.defineProperties(ancestor, {
      scrollHeight: { value: 800 },
      clientHeight: { value: 200 },
    })

    const preferred = document.createElement("div")
    Object.defineProperties(preferred, {
      scrollHeight: { value: 200 },
      clientHeight: { value: 200 },
      parentElement: { value: ancestor },
    })

    expect(resolveScrollContainer(preferred)).toBe(ancestor)
  })

  it("does not scroll when the element is already visible", () => {
    const scrollTo = vi.fn()
    const container = {
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 200,
      parentElement: null,
      getBoundingClientRect: () => createRect(0, 200),
      scrollTo,
    } as unknown as HTMLElement
    const element = {
      getBoundingClientRect: () => createRect(20, 80),
    } as HTMLElement

    expect(scrollElementIntoViewIfNeeded(element, container)).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it("scrolls the container when the element is below the viewport", () => {
    const container = createScrollContainer({})
    const element = {
      offsetHeight: 40,
      getBoundingClientRect: () => createRect(220, 260),
    } as HTMLElement

    expect(scrollElementIntoViewIfNeeded(element, container)).toBe(true)
    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 60,
      behavior: "smooth",
    })
  })

  it("aligns the element to the top when align is start", () => {
    const container = createScrollContainer({})
    const element = {
      offsetHeight: 40,
      getBoundingClientRect: () => createRect(220, 260),
    } as HTMLElement

    expect(
      scrollElementIntoViewIfNeeded(element, container, {
        align: "start",
        behavior: "auto",
      }),
    ).toBe(true)
    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 220,
      behavior: "auto",
    })
  })

  it("clamps start alignment for the last items in the list", () => {
    const container = createScrollContainer({
      scrollHeight: 260,
      clientHeight: 80,
    })
    const element = {
      offsetHeight: 40,
      getBoundingClientRect: () => createRect(220, 260),
    } as HTMLElement

    expect(
      scrollElementIntoViewIfNeeded(element, container, {
        align: "start",
        behavior: "auto",
      }),
    ).toBe(true)
    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 180,
      behavior: "auto",
    })
  })

  it("does not scroll on start alignment when the element is already at the top", () => {
    const scrollTo = vi.fn()
    const container = {
      scrollTop: 120,
      scrollHeight: 500,
      clientHeight: 200,
      parentElement: null,
      getBoundingClientRect: () => createRect(100, 300),
      scrollTo,
    } as unknown as HTMLElement
    const element = {
      offsetHeight: 50,
      getBoundingClientRect: () => createRect(100, 150),
    } as HTMLElement

    expect(
      scrollElementIntoViewIfNeeded(element, container, { align: "start" }),
    ).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it("scrolls the container when the element is above the viewport", () => {
    const container = createScrollContainer({
      scrollTop: 120,
      top: 100,
      bottom: 300,
    })
    const element = {
      offsetHeight: 50,
      getBoundingClientRect: () => createRect(40, 90),
    } as HTMLElement

    expect(scrollElementIntoViewIfNeeded(element, container)).toBe(true)
    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 60,
      behavior: "smooth",
    })
  })
})
