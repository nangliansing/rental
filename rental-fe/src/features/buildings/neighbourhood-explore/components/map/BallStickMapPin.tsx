import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type BallStickMapPinProps = {
  color: string
  ballSize: number
  variant?: "filled" | "light"
  isSelected?: boolean
  label?: string
  onClick?: () => void
  children?: ReactNode
}

export function BallStickMapPin({
  color,
  ballSize,
  variant = "filled",
  isSelected = false,
  label,
  onClick,
  children,
}: BallStickMapPinProps) {
  const stemHeight = 9
  const scale = isSelected ? 1.12 : 1
  const isLight = variant === "light"

  const PinGraphic = (
    <div
      className="flex flex-col items-center transition-transform duration-150"
      style={{ transform: `scale(${scale})` }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          isLight
            ? cn(
                "border bg-white shadow-[0_1px_4px_rgba(15,23,42,0.18)]",
                isSelected ? "border-[2.5px]" : "border-2",
              )
            : "border-2 border-white shadow-[0_2px_6px_rgba(15,23,42,0.28)]",
        )}
        style={{
          width: ballSize,
          height: ballSize,
          backgroundColor: isLight ? "#ffffff" : color,
          borderColor: isLight ? color : "white",
        }}
      >
        {children}
      </div>
      <div
        className="rounded-full"
        style={{
          width: isSelected ? 2.5 : 2,
          height: stemHeight,
          backgroundColor: color,
          opacity: isLight ? 0.85 : 1,
        }}
      />
    </div>
  )

  if (!onClick) {
    return (
      <div className="relative h-0 w-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          {PinGraphic}
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-0 w-0">
      <button
        type="button"
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
        )}
        aria-label={label}
        aria-pressed={isSelected}
        onClick={onClick}
      >
        {PinGraphic}
      </button>
    </div>
  )
}
