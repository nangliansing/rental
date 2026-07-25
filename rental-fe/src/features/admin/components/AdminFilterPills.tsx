import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

export type AdminFilterPillOption<TValue extends string | undefined> = {
  label: string
  value?: TValue
}

export function AdminFilterPills<TValue extends string | undefined>({
  options,
  value,
  onChange,
  scrollable = false,
}: {
  options: AdminFilterPillOption<TValue>[]
  value?: TValue
  onChange: (value: TValue | undefined) => void
  scrollable?: boolean
}) {
  return (
    <div
      className={cn(
        "mt-4 flex gap-2",
        scrollable
          ? "-mx-1 max-w-full overflow-x-auto overscroll-x-contain px-1 pb-1 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex-wrap",
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <AdminFilterPillButton
            key={option.label}
            label={option.label}
            isActive={isActive}
            scrollable={scrollable}
            onClick={() => onChange(option.value)}
          />
        )
      })}
    </div>
  )
}

function AdminFilterPillButton({
  label,
  isActive,
  scrollable,
  onClick,
}: {
  label: string
  isActive: boolean
  scrollable: boolean
  onClick: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isActive || !scrollable) return

    buttonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    })
  }, [isActive, scrollable])

  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(
        "h-8 rounded-full px-3 text-xs font-semibold transition",
        scrollable && "shrink-0 scroll-mx-2 whitespace-nowrap",
        isActive
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
