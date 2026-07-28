export type ScrollElementIntoViewAlign = "nearest" | "start"

export type ScrollElementIntoViewIfNeededOptions = {
  behavior?: ScrollBehavior
  align?: ScrollElementIntoViewAlign
}

/** Skip programmatic scroll when the target position is already close enough. */
export const SCROLL_ALIGN_TOLERANCE_PX = 4

/** Map/list sync: top-align instantly without smooth scrolling. */
export const NEIGHBOURHOOD_ACTIVE_PLACE_SCROLL_OPTIONS = {
  behavior: "auto",
  align: "start",
} as const satisfies ScrollElementIntoViewIfNeededOptions

type ScrollLayout = {
  elementRect: DOMRect
  containerRect: DOMRect
  relativeTop: number
  relativeBottom: number
}

export function isElementVisibleInScrollContainer(
  element: HTMLElement,
  container: HTMLElement,
): boolean {
  const layout = getScrollLayout(element, container)

  return (
    layout.elementRect.top >= layout.containerRect.top &&
    layout.elementRect.bottom <= layout.containerRect.bottom
  )
}

export function resolveScrollContainer(
  preferredContainer: HTMLElement,
): HTMLElement {
  if (preferredContainer.scrollHeight > preferredContainer.clientHeight) {
    return preferredContainer
  }

  let node: HTMLElement | null = preferredContainer.parentElement

  while (node) {
    const { overflowY } = getComputedStyle(node)

    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }

    node = node.parentElement
  }

  return preferredContainer
}

function getScrollLayout(
  element: HTMLElement,
  scrollContainer: HTMLElement,
): ScrollLayout {
  const elementRect = element.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()
  const relativeTop =
    elementRect.top - containerRect.top + scrollContainer.scrollTop

  return {
    elementRect,
    containerRect,
    relativeTop,
    relativeBottom: relativeTop + element.offsetHeight,
  }
}

function clampScrollTop(scrollContainer: HTMLElement, scrollTop: number) {
  const maxScrollTop = Math.max(
    0,
    scrollContainer.scrollHeight - scrollContainer.clientHeight,
  )

  return Math.max(0, Math.min(scrollTop, maxScrollTop))
}

export function scrollElementIntoViewIfNeeded(
  element: HTMLElement,
  container: HTMLElement,
  {
    behavior = "smooth",
    align = "nearest",
  }: ScrollElementIntoViewIfNeededOptions = {},
): boolean {
  const scrollContainer = resolveScrollContainer(container)
  const layout = getScrollLayout(element, scrollContainer)

  if (align === "start") {
    const nextScrollTop = clampScrollTop(scrollContainer, layout.relativeTop)

    if (
      Math.abs(scrollContainer.scrollTop - nextScrollTop) <=
      SCROLL_ALIGN_TOLERANCE_PX
    ) {
      return false
    }

    scrollContainer.scrollTo({ top: nextScrollTop, behavior })
    return true
  }

  if (
    layout.elementRect.top >= layout.containerRect.top &&
    layout.elementRect.bottom <= layout.containerRect.bottom
  ) {
    return false
  }

  const viewTop = scrollContainer.scrollTop
  const viewBottom = viewTop + scrollContainer.clientHeight

  let nextScrollTop = viewTop

  if (layout.relativeTop < viewTop) {
    nextScrollTop = layout.relativeTop
  } else if (layout.relativeBottom > viewBottom) {
    nextScrollTop = layout.relativeBottom - scrollContainer.clientHeight
  }

  scrollContainer.scrollTo({ top: nextScrollTop, behavior })
  return true
}
