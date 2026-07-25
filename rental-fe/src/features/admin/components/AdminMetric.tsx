import type { ReactNode } from "react"

export function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export function AdminMiniFact({
  icon,
  value,
}: {
  icon: ReactNode
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
      <span className="text-slate-400">{icon}</span>
      {value}
    </div>
  )
}
