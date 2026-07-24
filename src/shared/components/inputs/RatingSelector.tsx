import { useId } from "react"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

export type RatingSelectorSize = "small" | "medium" | "large"

type RatingSelectorProps = {
  label?: string
  value?: number
  onChange: (value: number) => void
  max?: number
  size?: RatingSelectorSize
  disabled?: boolean
  className?: string
}

const sizeClasses: Record<RatingSelectorSize, string> = {
  small: "h-5 w-5",
  medium: "h-7 w-7",
  large: "h-8 w-8",
}

export function RatingSelector({
  label,
  value,
  onChange,
  max = 5,
  size = "medium",
  disabled = false,
  className,
}: RatingSelectorProps) {
  const fieldName = useId()
  const normalizedLabel = label?.trim() ?? ""
  const normalizedMax = Number.isFinite(max)
    ? Math.min(10, Math.max(1, Math.trunc(max)))
    : 5
  const normalizedValue = Number.isFinite(value)
    ? Math.min(normalizedMax, Math.max(0, Math.trunc(value ?? 0)))
    : 0

  return (
    <fieldset
      disabled={disabled}
      aria-label={normalizedLabel ? undefined : "Rating"}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
    >
      {normalizedLabel && (
        <legend className="p-0 text-sm font-semibold text-slate-950">
          {normalizedLabel}
        </legend>
      )}

      <div className={cn("flex gap-2", normalizedLabel && "mt-3")}>
        {Array.from({ length: normalizedMax }, (_, index) => {
          const ratingValue = index + 1
          const inputId = `${fieldName}-${ratingValue}`
          const isFilled = ratingValue <= normalizedValue

          return (
            <span
              key={ratingValue}
              className="relative inline-flex shrink-0"
            >
              <input
                id={inputId}
                className="peer sr-only"
                type="radio"
                name={fieldName}
                value={ratingValue}
                checked={ratingValue === normalizedValue}
                disabled={disabled}
                aria-label={`${ratingValue} ${ratingValue === 1 ? "star" : "stars"}`}
                onChange={() => onChange(ratingValue)}
              />
              <label
                htmlFor={inputId}
                className="cursor-pointer rounded-full p-1 text-amber-400 transition-transform hover:scale-105 peer-focus-visible:ring-2 peer-focus-visible:ring-slate-950 peer-focus-visible:ring-offset-2 peer-disabled:pointer-events-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
              >
                <Star
                  aria-hidden="true"
                  className={cn(
                    sizeClasses[size],
                    isFilled ? "fill-current" : "text-slate-200",
                  )}
                />
              </label>
            </span>
          )
        })}
      </div>
    </fieldset>
  )
}
