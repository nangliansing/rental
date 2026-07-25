import { PencilLine, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

type BuildingSummaryActionBarProps = {
  editLabel: string
  draftEditLabel: string
  hasManagementActions: boolean
  hasDraftEditAction: boolean
  onListHere?: () => void
  onRequestEdit?: () => void
  onEditDraft?: () => void
}

const iconButtonClassName =
  "flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"

function BuildingSummaryIconButton({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <div className={cn("group relative shrink-0", className)}>
      <button
        type="button"
        className={iconButtonClassName}
        onClick={onClick}
        aria-label={label}
      >
        <PencilLine className="h-4 w-4" aria-hidden="true" />
      </button>

      <span
        className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus-within:block"
        role="tooltip"
      >
        {label}
      </span>
    </div>
  )
}

export function BuildingSummaryActionBar({
  editLabel,
  draftEditLabel,
  hasManagementActions,
  hasDraftEditAction,
  onListHere,
  onRequestEdit,
  onEditDraft,
}: BuildingSummaryActionBarProps) {
  if (!hasManagementActions && !hasDraftEditAction) {
    return null
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      {hasManagementActions && onListHere && (
        <button
          type="button"
          className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={onListHere}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">List a room here</span>
        </button>
      )}

      {hasManagementActions && onRequestEdit && (
        <BuildingSummaryIconButton
          label={editLabel}
          onClick={onRequestEdit}
        />
      )}

      {hasDraftEditAction && onEditDraft && (
        <BuildingSummaryIconButton
          label={draftEditLabel}
          onClick={onEditDraft}
        />
      )}
    </div>
  )
}
