import type { ReactNode } from "react"

export function AdminStatusChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
      {label}
    </span>
  )
}

export function AdminChipList({
  label,
  values,
  icon,
}: {
  label: string
  values: string[]
  icon?: ReactNode
}) {
  if (values.length === 0) return null

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}
