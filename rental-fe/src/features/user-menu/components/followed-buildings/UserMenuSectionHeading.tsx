type UserMenuSectionHeadingProps = {
  title: string
  total?: number | null
}

export function UserMenuSectionHeading({
  title,
  total,
}: UserMenuSectionHeadingProps) {
  const safeTotal =
    typeof total === "number" && Number.isFinite(total) && total > 0
      ? total
      : null

  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      {safeTotal !== null ? (
        <span className="text-xs font-medium text-slate-500">{safeTotal}</span>
      ) : null}
    </div>
  )
}
