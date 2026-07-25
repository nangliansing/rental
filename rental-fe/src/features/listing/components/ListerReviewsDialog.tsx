import { X } from "lucide-react"

import { ListerReviewsSection } from "@/features/lister-review/components"
import type { SearchListing } from "@/features/map-search/types"
import { Avatar } from "@/shared/components/data-display/Avatar"
import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "@/shared/components/dialogs/DialogShell"

type ListerReviewsDialogProps = {
  agent: NonNullable<SearchListing["agentProfile"]>
  isOpen: boolean
  onClose: () => void
}

export function ListerReviewsDialog({
  agent,
  isOpen,
  onClose,
}: ListerReviewsDialogProps) {
  if (!isOpen) return null

  const displayName =
    typeof agent.displayName === "string" && agent.displayName.trim()
      ? agent.displayName.trim()
      : "Lister"

  return (
    <DialogShell
      isOpen={isOpen}
      onDismiss={onClose}
      contentClassName="flex h-dvh max-h-dvh w-full max-w-none flex-col p-0 sm:h-[min(760px,calc(100vh-3rem))] sm:max-h-[calc(100vh-3rem)] sm:max-w-3xl sm:rounded-2xl"
    >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                displayName={displayName}
                photo={agent.profilePhoto}
                colorKey={agent._id}
                size="lg"
                loading="eager"
              />

              <div className="min-w-0">
                <DialogTitle
                  className="truncate text-lg font-semibold text-slate-950"
                >
                  Lister reviews
                </DialogTitle>
                <DialogDescription className="mt-0.5 truncate text-sm font-medium text-slate-500">
                  {displayName}
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Close lister reviews"
              onClick={onClose}
              autoFocus
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ListerReviewsSection
              listerProfileId={agent._id}
              listerUserId={agent.userId}
              reviewSummary={agent.reviewSummary}
              showHeader={false}
              className="mx-auto max-w-3xl px-4 md:px-5"
            />
          </div>
    </DialogShell>
  )
}
