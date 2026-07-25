import type { ReactNode } from "react"

export type AdminContactRowProps = {
  label: string
  value: string
  href?: string
  icon: ReactNode
}

export function AdminContactRow({
  label,
  value,
  href,
  icon,
}: AdminContactRowProps) {
  const content = (
    <>
      <span className="text-slate-400">{icon}</span>
      <span className="w-20 shrink-0 font-medium text-slate-700">{label}</span>
      <span className="min-w-0 truncate text-slate-500">{value}</span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
      >
        {content}
      </a>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      {content}
    </div>
  )
}
