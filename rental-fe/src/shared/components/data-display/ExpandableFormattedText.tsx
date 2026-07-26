import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { clampCollapsedLines, hasFormattedText } from "./formatted-text"

function measureTextOverflow(element: HTMLElement) {
  const clampedHeight = element.getBoundingClientRect().height

  const previousDisplay = element.style.display
  const previousOverflow = element.style.overflow
  const previousLineClamp = element.style.webkitLineClamp
  const previousBoxOrient = element.style.webkitBoxOrient

  element.style.display = "block"
  element.style.overflow = "visible"
  element.style.webkitLineClamp = "unset"
  element.style.webkitBoxOrient = "unset"

  const fullHeight = element.scrollHeight

  element.style.display = previousDisplay
  element.style.overflow = previousOverflow
  element.style.webkitLineClamp = previousLineClamp
  element.style.webkitBoxOrient = previousBoxOrient

  if (fullHeight > clampedHeight + 1) return true

  return element.scrollHeight > element.clientHeight + 1
}

type ExpandableFormattedTextProps = {
  text: unknown
  collapsedLines?: number
  className?: string
  textClassName?: string
  expandLabel?: string
  collapseLabel?: string
}

export function ExpandableFormattedText({
  text,
  collapsedLines = 2,
  className,
  textClassName,
  expandLabel = "See more",
  collapseLabel = "See less",
}: ExpandableFormattedTextProps) {
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const previousTextRef = useRef(text)
  const [isExpanded, setIsExpanded] = useState(false)
  const [canToggle, setCanToggle] = useState(false)
  const textId = useId()
  const lineCount = clampCollapsedLines(collapsedLines)

  useEffect(() => {
    if (previousTextRef.current === text) return

    previousTextRef.current = text
    setIsExpanded(false)
    setCanToggle(false)
  }, [text])

  useLayoutEffect(() => {
    const element = textRef.current
    if (!element || isExpanded) {
      setCanToggle(false)
      return undefined
    }

    const measure = () => {
      setCanToggle(measureTextOverflow(element))
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [isExpanded, lineCount, text])

  if (!hasFormattedText(text)) return null

  const showToggle = canToggle || isExpanded

  return (
    <div className={className}>
      <p
        id={textId}
        ref={textRef}
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-6 text-slate-700",
          !isExpanded && "overflow-hidden",
          textClassName,
        )}
        style={
          isExpanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: lineCount,
              }
        }
      >
        {text}
      </p>

      {showToggle && (
        <button
          type="button"
          className="mt-1 text-sm font-semibold text-slate-950 hover:text-slate-700"
          aria-expanded={isExpanded}
          aria-controls={textId}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  )
}
