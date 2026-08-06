import { lazy, Suspense, useRef } from "react"
import { Bookmark } from "lucide-react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { canUsePersonalActions } from "@/features/auth/utils/canUsePersonalActions"
import { FloatingActionPanel } from "@/shared/components/navigation/FloatingActionPanel"
import type { FloatingActionPanelVariant } from "@/shared/components/navigation/FloatingActionPanel"
import { useFloatingActionPanel } from "@/shared/hooks/useFloatingActionPanel"
import { cn } from "@/lib/utils"

const SavedSearchDrawerPanel = lazy(async () => ({
  default: (await import("@/features/saved-search/components/SavedSearchDrawerPanel"))
    .SavedSearchDrawerPanel,
}))

function SavedSearchPanelFallback() {
  return (
    <div
      className="flex min-h-40 items-center justify-center px-4 text-sm text-slate-500"
      role="status"
      aria-live="polite"
    >
      Loading saved searches...
    </div>
  )
}

type SavedSearchesButtonProps = {
  /** Desktop dropdown, or full-screen mobile modal (map search chrome). */
  variant: Extract<FloatingActionPanelVariant, "desktop" | "mobileFullscreen">
  className?: string
}

/** Map-search chrome control that opens owner saved searches (auth-only). */
export function SavedSearchesButton({
  variant,
  className,
}: SavedSearchesButtonProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { isOpen, isVisible, togglePanel, closePanel } = useFloatingActionPanel()

  const canUseSavedSearches = canUsePersonalActions({
    user,
    isAuthenticated,
    isLoading,
  })

  if (!canUseSavedSearches) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Saved searches"
        aria-expanded={isOpen}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg transition hover:bg-slate-50 hover:text-slate-950 active:scale-95",
          isOpen && "bg-slate-50 text-slate-950",
          className,
        )}
        onClick={togglePanel}
      >
        <Bookmark
          className={cn("h-5 w-5", isVisible && "fill-current")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <FloatingActionPanel
          variant={variant}
          isVisible={isVisible}
          title="Saved searches"
          subtitle="Map searches you’re watching for matching buildings"
          closeLabel="Close saved searches"
          bodyRef={scrollRef}
          anchorRef={variant === "desktop" ? triggerRef : undefined}
          onClose={closePanel}
        >
          <Suspense fallback={<SavedSearchPanelFallback />}>
            <SavedSearchDrawerPanel
              enabled={isOpen}
              scrollRootRef={scrollRef}
            />
          </Suspense>
        </FloatingActionPanel>
      ) : null}
    </>
  )
}
