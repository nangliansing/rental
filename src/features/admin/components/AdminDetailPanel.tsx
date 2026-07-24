import type { ReactNode } from "react"

export function AdminDetailPanel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}
