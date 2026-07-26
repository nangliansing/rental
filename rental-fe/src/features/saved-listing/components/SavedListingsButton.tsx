import { lazy, Suspense, useRef } from "react"
import { Heart } from "lucide-react"

import { FloatingActionPanel } from "@/shared/components/navigation/FloatingActionPanel"
import { useFloatingActionPanel } from "@/shared/hooks/useFloatingActionPanel"
import { cn } from "@/lib/utils"

const SavedListingsPanel = lazy(async () => ({
  default: (await import("./SavedListingsPanel")).SavedListingsPanel,
}))

function SavedListingsPanelFallback() {
  return (
    <div
      className="flex min-h-40 items-center justify-center px-4 text-sm text-slate-500"
      role="status"
      aria-live="polite"
    >
      Loading saved listings...
    </div>
  )
}

type SavedListingsButtonProps = {
  variant: "desktop" | "mobile"
}

export function SavedListingsButton({ variant }: SavedListingsButtonProps) {
  const { isOpen, isVisible, togglePanel, closePanel } = useFloatingActionPanel()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <>
      <button
        type="button"
        aria-label="Saved listings"
        aria-expanded={isOpen}
        className={cn(
          "relative flex items-center justify-center text-slate-600 transition-all duration-200 ease-out hover:text-slate-950 active:scale-95",
          variant === "desktop"
            ? "h-10 w-10 rounded-full hover:bg-slate-100"
            : "flex-col gap-1 text-xs font-medium",
          isOpen && variant === "desktop" && "bg-slate-100 text-slate-950",
          isOpen && variant === "mobile" && "text-slate-950",
        )}
        onClick={togglePanel}
      >
        <Heart
          className={cn(
            "transition-transform duration-200 ease-out",
            variant === "desktop" ? "h-4 w-4" : "h-5 w-5",
            isVisible && "scale-110 fill-current text-rose-500",
          )}
        />
        {variant === "mobile" && <span>Saved</span>}
      </button>

      {isOpen && (
        <FloatingActionPanel
          variant={variant}
          isVisible={isVisible}
          title="Saved"
          subtitle="Rooms you want to revisit"
          closeLabel="Close saved listings"
          bodyRef={scrollRef}
          onClose={closePanel}
        >
          <Suspense fallback={<SavedListingsPanelFallback />}>
            <SavedListingsPanel
              enabled={isOpen}
              layout="drawer"
              rootRef={scrollRef}
            />
          </Suspense>
        </FloatingActionPanel>
      )}
    </>
  )
}
