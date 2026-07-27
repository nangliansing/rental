export type ScrollElementIntoViewIfNeededOptions = {
  behavior?: ScrollBehavior
}

export function isElementVisibleInScrollContainer(
  element: HTMLElement,
  container: HTMLElement,
): boolean {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return (
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom
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

export function scrollElementIntoViewIfNeeded(
  element: HTMLElement,
  container: HTMLElement,
  { behavior = "smooth" }: ScrollElementIntoViewIfNeededOptions = {},
): boolean {
  const scrollContainer = resolveScrollContainer(container)

  if (isElementVisibleInScrollContainer(element, scrollContainer)) {
    return false
  }

  const elementRect = element.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()
  const relativeTop =
    elementRect.top - containerRect.top + scrollContainer.scrollTop
  const relativeBottom = relativeTop + element.offsetHeight
  const viewTop = scrollContainer.scrollTop
  const viewBottom = viewTop + scrollContainer.clientHeight

  let nextScrollTop = viewTop

  if (relativeTop < viewTop) {
    nextScrollTop = relativeTop
  } else if (relativeBottom > viewBottom) {
    nextScrollTop = relativeBottom - scrollContainer.clientHeight
  }

  scrollContainer.scrollTo({ top: nextScrollTop, behavior })
  return true
}
