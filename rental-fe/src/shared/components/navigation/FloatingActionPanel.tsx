import { useEffect, type ReactNode, type RefObject } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { ModalPortal } from "@/shared/components/ModalPortal"
import { MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS } from "@/shared/components/navigation/mobileNavLayout"

type FloatingActionPanelProps = {
  variant: "desktop" | "mobile"
  isVisible: boolean
  title: string
  subtitle: string
  closeLabel: string
  bodyRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
  onClose: () => void
}

export function FloatingActionPanel({
  variant,
  isVisible,
  title,
  subtitle,
  closeLabel,
  bodyRef,
  children,
  onClose,
}: FloatingActionPanelProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <ModalPortal>
      <div
        className={cn(
          "fixed inset-0",
          variant === "desktop" ? "z-[80]" : "z-40",
        )}
        onClick={onClose}
      >
        {variant === "mobile" && (
          <div
            className={cn(
              "absolute inset-0 bg-slate-950/35 transition-opacity duration-200 ease-out",
              isVisible ? "opacity-100" : "opacity-0",
            )}
          />
        )}

        <section
          className={cn(
            "fixed flex flex-col overflow-hidden bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out",
            variant === "desktop"
              ? "right-4 top-20 h-[min(620px,calc(100vh-6rem))] w-[390px] origin-top-right rounded-2xl border border-slate-200"
              : "bottom-0 left-0 right-0 h-[80dvh] max-h-[80dvh] rounded-t-[28px]",
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : variant === "desktop"
                ? "-translate-y-1 scale-95 opacity-0"
                : "translate-y-full opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b border-slate-100 px-5 py-4",
              variant === "mobile" && "pt-5",
            )}
          >
            <div>
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="text-sm font-medium text-slate-500">{subtitle}</p>
            </div>

            <button
              type="button"
              aria-label={closeLabel}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={bodyRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              variant === "mobile" && MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS,
            )}
          >
            {children}
          </div>
        </section>
      </div>
    </ModalPortal>
  )
}
