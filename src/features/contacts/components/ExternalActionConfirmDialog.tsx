import type { ComponentType } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "@/shared/components/dialogs/DialogShell"

type ExternalActionConfirmDialogProps = {
  confirmLabel: string
  description: string
  icon: ComponentType<{ className?: string }>
  iconClassName?: string
  isOpen: boolean
  title: string
  onCancel: () => void
  onConfirm: () => void
}

export function ExternalActionConfirmDialog({
  confirmLabel,
  description,
  icon: Icon,
  iconClassName,
  isOpen,
  title,
  onCancel,
  onConfirm,
}: ExternalActionConfirmDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      contentClassName="max-w-sm rounded-2xl"
      onDismiss={onCancel}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100">
            <Icon className={cn("h-5 w-5 text-slate-700", iconClassName)} />
          </div>

          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold text-slate-950">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-slate-500">
              {description}
            </DialogDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full border-0 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close confirmation"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-slate-300 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-full bg-slate-950 px-5 font-semibold text-white hover:bg-slate-800"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </DialogShell>
  )
}
