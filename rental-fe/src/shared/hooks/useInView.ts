import { useEffect, useState, type RefCallback } from "react"

export type UseInViewOptions = {
  threshold?: number
  rootMargin?: string
  /** When false, always reports not in view and skips observing. Default true. */
  enabled?: boolean
}

/**
 * Observes an element and reports whether it intersects the viewport.
 * Uses a callback ref so observation starts as soon as the node mounts.
 */
export function useInView(options: UseInViewOptions = {}): {
  ref: RefCallback<Element>
  isInView: boolean
} {
  const { threshold = 0.35, rootMargin, enabled = true } = options
  const [node, setNode] = useState<Element | null>(null)
  const [isInView, setIsInView] = useState(false)
  const canObserve = typeof IntersectionObserver !== "undefined"

  useEffect(() => {
    if (!enabled || !node || !canObserve) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(Boolean(entry?.isIntersecting))
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [canObserve, enabled, node, rootMargin, threshold])

  return {
    ref: setNode,
    isInView: enabled && Boolean(node) && (!canObserve || isInView),
  }
}
