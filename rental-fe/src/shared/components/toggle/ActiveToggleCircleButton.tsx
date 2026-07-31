import { Check, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type ActiveToggleSettleOutcome = "success" | "error"

const ICON_STROKE_WIDTH = 3.5

const SIZE_CLASS_NAME = {
  xs: {
    button: "size-5",
    icon: "size-2.5",
    ring: "focus-visible:ring-offset-1",
  },
  sm: {
    button: "size-7",
    icon: "size-3.5",
    ring: "focus-visible:ring-offset-1",
  },
  md: {
    button: "size-8",
    icon: "size-4",
    ring: "focus-visible:ring-offset-1",
  },
  lg: {
    button: "size-9",
    icon: "size-4.5",
    ring: "focus-visible:ring-offset-2",
  },
} as const

export type ActiveToggleCircleButtonProps = {
  isActive: boolean
  isPending?: boolean
  isDisabled?: boolean
  onClick: () => void
  settleSignal?: number
  size?: keyof typeof SIZE_CLASS_NAME
  activeLabel?: string
  inactiveLabel?: string
  className?: string
}

export function ActiveToggleCircleButton({
  isActive,
  isPending = false,
  isDisabled = false,
  onClick,
  settleSignal = 0,
  size = "xs",
  activeLabel = "Deactivate",
  inactiveLabel = "Activate",
  className,
}: ActiveToggleCircleButtonProps) {
  const [settleKey, setSettleKey] = useState(0)
  const previousSettleSignalRef = useRef(settleSignal)
  const sizeClassName = SIZE_CLASS_NAME[size]

  useEffect(() => {
    if (settleSignal <= previousSettleSignalRef.current) return

    previousSettleSignalRef.current = settleSignal
    setSettleKey(settleSignal)
  }, [settleSignal])

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full border-0",
        "transition-[background-color,box-shadow,opacity,transform] duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70",
        sizeClassName.ring,
        "disabled:cursor-not-allowed",
        sizeClassName.button,
        isActive
          ? "bg-white text-red-500 shadow-[0_2px_8px_rgba(15,23,42,0.16)]"
          : "bg-red-500 text-white shadow-[0_2px_8px_rgba(15,23,42,0.2)] hover:bg-red-600 hover:shadow-[0_3px_10px_rgba(15,23,42,0.24)]",
        isPending && "opacity-70",
        className,
      )}
      aria-pressed={isActive}
      aria-busy={isPending || undefined}
      aria-label={isActive ? activeLabel : inactiveLabel}
      disabled={isDisabled || isPending}
      onClick={onClick}
    >
      <span
        key={settleKey}
        aria-hidden="true"
        className={cn(
          "relative inline-flex transform-gpu items-center justify-center",
          sizeClassName.icon,
          isPending && "active-toggle-pending",
          !isPending && settleKey > 0 && "active-toggle-settle",
        )}
      >
        <Plus
          strokeWidth={ICON_STROKE_WIDTH}
          className={cn(
            "absolute inset-0 m-auto transition-[opacity,transform] duration-200 ease-out",
            sizeClassName.icon,
            isActive ? "scale-75 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Check
          strokeWidth={ICON_STROKE_WIDTH}
          className={cn(
            "absolute inset-0 m-auto transition-[opacity,transform] duration-200 ease-out",
            sizeClassName.icon,
            isActive ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        />
      </span>
    </button>
  )
}
