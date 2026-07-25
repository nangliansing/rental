export function AdminSectionTitle({
  title,
  detail,
}: {
  title: string
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {detail && <p className="text-sm text-slate-400">{detail}</p>}
    </div>
  )
}
