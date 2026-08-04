type ClientRequestGeoSummaryCardProps = {
  title: string
  detail: string
  className?: string
}

/** Compact card summarizing the selected geo search for confirm / detail UIs. */
export function ClientRequestGeoSummaryCard({
  title,
  detail,
  className,
}: ClientRequestGeoSummaryCardProps) {
  return (
    <div
      className={
        className ??
        "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
      }
    >
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  )
}
