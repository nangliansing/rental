import type { ComponentType } from "react"

type ProfileSectionTabProps = {
  isActive?: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}

export function ProfileSectionTab({
  isActive = false,
  icon: Icon,
  label,
  onClick,
}: ProfileSectionTabProps) {
  const tabClassName = isActive
    ? "flex h-14 items-center justify-center gap-1 border-b-2 border-slate-950 text-xs font-semibold text-slate-950 sm:gap-2 sm:text-sm md:text-base"
    : "flex h-14 items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-950 sm:gap-2 sm:text-sm md:text-base"

  return (
    <button
      type="button"
      className={tabClassName}
      aria-selected={isActive}
      role="tab"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}
