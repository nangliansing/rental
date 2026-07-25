import type { ReactNode } from "react"

export function AdminInfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <div className="mt-0.5 text-slate-400">{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-slate-700">{value}</p>
      </div>
    </div>
  )
}
