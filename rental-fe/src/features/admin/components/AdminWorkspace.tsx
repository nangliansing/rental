import type { ReactNode } from "react"

export function AdminWorkspace({
  title,
  description,
  total,
  filters,
  list,
  detail,
}: {
  title: string
  description: string
  total?: number
  filters?: ReactNode
  list: ReactNode
  detail: ReactNode
}) {
  return (
    <section className="grid min-h-0 flex-1 grid-cols-[390px_1fr] overflow-hidden">
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-slate-200">
        <div className="shrink-0 pl-6 pr-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            {typeof total === "number" && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {total}
              </span>
            )}
          </div>

          {filters}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="pl-6 pr-5">{list}</div>
        </div>
      </aside>

      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="py-5 pl-6 pr-6">{detail}</div>
      </div>
    </section>
  )
}
