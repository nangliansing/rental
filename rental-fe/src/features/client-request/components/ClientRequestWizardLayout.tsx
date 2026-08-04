import type { ReactNode } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

import { ClientRequestFormHeader } from "./ClientRequestFormHeader"
import { ClientRequestStepDots } from "./ClientRequestStepDots"

/** DialogShell `contentClassName` for full-screen mobile / card desktop wizards. */
export const CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME =
  "flex h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden rounded-none p-0 text-left shadow-xl sm:h-auto sm:max-h-[min(40rem,calc(100dvh-2rem))] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-2xl"

type ClientRequestWizardLayoutProps = {
  step: 1 | 2
  title: string
  description: string
  onClose: () => void
  closeDisabled?: boolean
  closeAriaLabel?: string
  /** Map (or other) preview shown behind overlays on step 1. */
  hero?: ReactNode
  /**
   * Use Radix dialog heading semantics inside DialogShell.
   * Prefer `"page"` for create / edit routes.
   */
  headerSemantics?: "dialog" | "page"
  className?: string
  children: ReactNode
}

/**
 * Shared chrome for the two-step client-request wizard:
 * step dots, close control, optional hero, header, and scrollable body.
 */
export function ClientRequestWizardLayout({
  step,
  title,
  description,
  onClose,
  closeDisabled = false,
  closeAriaLabel = "Close",
  hero,
  headerSemantics = "page",
  className,
  children,
}: ClientRequestWizardLayoutProps) {
  const hasHero = Boolean(hero)
  const closeButtonClassName = cn(
    "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur hover:bg-white hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50",
    hasHero ? "ring-1 ring-black/10" : "ring-1 ring-slate-200",
  )

  const overlays = (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
        <ClientRequestStepDots step={step} />
      </div>
      <button
        type="button"
        className={closeButtonClassName}
        aria-label={closeAriaLabel}
        disabled={closeDisabled}
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>
    </>
  )

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      {hasHero ? (
        <div className="relative h-44 shrink-0 overflow-hidden bg-slate-100 sm:h-52">
          {hero}
          {overlays}
        </div>
      ) : (
        <>
          {overlays}
          <div className="h-12 shrink-0" aria-hidden="true" />
        </>
      )}

      <ClientRequestFormHeader
        title={title}
        description={description}
        semantics={headerSemantics}
      />

      {children}
    </div>
  )
}
