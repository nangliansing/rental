import { cn } from "@/lib/utils"

export type SearchMode = "places" | "listers"

type SearchModeTabsProps = {
  value: SearchMode
  onChange: (value: SearchMode) => void
}

const modes: Array<{ label: string; value: SearchMode }> = [
  { label: "Places", value: "places" },
  { label: "Listers", value: "listers" },
]

export function SearchModeTabs({ value, onChange }: SearchModeTabsProps) {
  return (
    <div
      className="flex border-b border-slate-100"
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
    >
      {modes.map((mode) => {
        const isActive = value === mode.value

        return (
          <button
            key={mode.value}
            type="button"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            className={cn(
              "relative h-10 px-5 text-sm font-semibold transition",
              isActive
                ? "text-slate-950"
                : "text-slate-400 hover:text-slate-600",
            )}
            onClick={() => onChange(mode.value)}
          >
            {mode.label}

            {isActive && (
              <span className="absolute bottom-0 left-5 right-5 h-0.5 rounded-full bg-slate-950" />
            )}
          </button>
        )
      })}
    </div>
  )
}
