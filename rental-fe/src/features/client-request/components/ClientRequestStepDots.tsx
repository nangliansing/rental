import { cn } from "@/lib/utils"

type ClientRequestStepDotsProps = {
  step: 1 | 2
  className?: string
}

/** Shared step indicator for create / edit client-request wizards. */
export function ClientRequestStepDots({
  step,
  className,
}: ClientRequestStepDotsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none inline-flex items-center justify-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 shadow-sm backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-label={`Step ${step} of 2`}
    >
      {([1, 2] as const).map((dotStep) => {
        const isActive = dotStep === step

        return (
          <span
            key={dotStep}
            className={cn(
              "rounded-full transition-[background-color,box-shadow,width,height]",
              isActive
                ? "h-2 w-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]"
                : "h-1.5 w-1.5 bg-white/35",
            )}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}
