import { cn } from "@/lib/utils"

type ProgressRingProps = {
    progress: number
    className?: string
    label?: string
}

export function ProgressRing({
    progress,
    className,
    label = "Upload progress",
}: ProgressRingProps) {
    const value = Number.isFinite(progress)
        ? Math.min(Math.max(Math.round(progress), 0), 100)
        : 0
    const radius = 22
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference - (value / 100) * circumference

    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-sm",
                className
            )}
        >
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-slate-200"
                />

                <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="text-blue-600 transition-all"
                />
            </svg>

            <span className="absolute text-xs font-semibold text-slate-950">
                {value}%
            </span>
        </div>
    )
}
