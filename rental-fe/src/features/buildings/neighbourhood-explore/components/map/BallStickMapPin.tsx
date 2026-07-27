import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type BallStickMapPinProps = {
  color: string
  ballSize: number
  variant?: "filled" | "light"
  isSelected?: boolean
  children?: ReactNode
}

function getSelectedLightPinShadow(color: string) {
  return `0 0 0 2px #ffffff, 0 0 0 5px ${color}, 0 8px 18px rgba(15, 23, 42, 0.34)`
}

export function BallStickMapPin({
  color,
  ballSize,
  variant = "filled",
  isSelected = false,
  children,
}: BallStickMapPinProps) {
  const stemHeight = isSelected ? 11 : 9
  const scale = isSelected ? 1.2 : 1
  const isLight = variant === "light"
  const isLightSelected = isLight && isSelected
  const ballBackgroundColor = isLightSelected ? color : isLight ? "#ffffff" : color
  const ballBorderColor = isLight ? color : "white"

  return (
    <div
      className="flex flex-col items-center transition-transform duration-200 ease-out"
      style={{ transform: `scale(${scale})` }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full transition-[background-color,border-color,box-shadow] duration-200 ease-out",
          isLight &&
            !isLightSelected &&
            "border-2 border bg-white shadow-[0_1px_4px_rgba(15,23,42,0.18)]",
          isLightSelected && "border-[3px]",
          !isLight &&
            "border-2 border-white shadow-[0_2px_6px_rgba(15,23,42,0.28)]",
        )}
        style={{
          width: ballSize,
          height: ballSize,
          backgroundColor: ballBackgroundColor,
          borderColor: ballBorderColor,
          ...(isLightSelected
            ? { boxShadow: getSelectedLightPinShadow(color) }
            : {}),
        }}
      >
        {children}
      </div>
      <div
        className="rounded-full transition-all duration-200 ease-out"
        style={{
          width: isSelected ? 3 : 2,
          height: stemHeight,
          backgroundColor: color,
          opacity: isLight ? 0.85 : 1,
        }}
      />
    </div>
  )
}
