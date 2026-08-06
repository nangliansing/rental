import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { ModalPortal } from "@/shared/components/ModalPortal"
import { MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS } from "@/shared/components/navigation/mobileNavLayout"

export type FloatingActionPanelVariant =
  | "desktop"
  | "mobile"
  | "mobileFullscreen"

const DESKTOP_PANEL_WIDTH_PX = 390
const DESKTOP_PANEL_GAP_PX = 8
const DESKTOP_PANEL_EDGE_PADDING_PX = 16

type FloatingActionPanelProps = {
  variant: FloatingActionPanelVariant
  isVisible: boolean
  title: string
  subtitle: string
  closeLabel: string
  bodyRef?: RefObject<HTMLDivElement | null>
  /**
   * When set on desktop, the panel anchors under this element instead of the
   * default top-right nav position (used for map chrome controls).
   */
  anchorRef?: RefObject<HTMLElement | null>
  children: ReactNode
  onClose: () => void
}

function getAnchoredDesktopStyle(
  trigger: HTMLElement,
): CSSProperties {
  const rect = trigger.getBoundingClientRect()
  const top = rect.bottom + DESKTOP_PANEL_GAP_PX
  const maxLeft =
    window.innerWidth - DESKTOP_PANEL_WIDTH_PX - DESKTOP_PANEL_EDGE_PADDING_PX
  const left = Math.min(
    Math.max(DESKTOP_PANEL_EDGE_PADDING_PX, rect.left),
    Math.max(DESKTOP_PANEL_EDGE_PADDING_PX, maxLeft),
  )

  return {
    top,
    left,
    right: "auto",
    width: DESKTOP_PANEL_WIDTH_PX,
    height: `min(620px, calc(100vh - ${top + DESKTOP_PANEL_EDGE_PADDING_PX}px))`,
  }
}

export function FloatingActionPanel({
  variant,
  isVisible,
  title,
  subtitle,
  closeLabel,
  bodyRef,
  anchorRef,
  children,
  onClose,
}: FloatingActionPanelProps) {
  const isMobileSheet = variant === "mobile"
  const isMobileFullscreen = variant === "mobileFullscreen"
  const isDesktop = variant === "desktop"
  const [anchoredStyle, setAnchoredStyle] = useState<CSSProperties | undefined>()

  useLayoutEffect(() => {
    if (!isDesktop || !anchorRef?.current) {
      setAnchoredStyle(undefined)
      return
    }

    const updatePosition = () => {
      if (!anchorRef.current) return
      setAnchoredStyle(getAnchoredDesktopStyle(anchorRef.current))
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [anchorRef, isDesktop, isVisible])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const usesAnchor = isDesktop && Boolean(anchoredStyle)

  return (
    <ModalPortal>
      <div
        className={cn(
          "fixed inset-0",
          isDesktop ? "z-[80]" : isMobileFullscreen ? "z-[110]" : "z-40",
        )}
        onClick={onClose}
      >
        {isMobileSheet ? (
          <div
            className={cn(
              "absolute inset-0 bg-slate-950/35 transition-opacity duration-200 ease-out",
              isVisible ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}

        <section
          className={cn(
            "fixed flex flex-col overflow-hidden bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out",
            isDesktop &&
              "h-[min(620px,calc(100vh-6rem))] w-[390px] rounded-2xl border border-slate-200",
            isDesktop &&
              !usesAnchor &&
              "right-4 top-20 origin-top-right",
            isDesktop && usesAnchor && "origin-top-left",
            isMobileSheet &&
              "bottom-0 left-0 right-0 h-[80dvh] max-h-[80dvh] rounded-t-[28px]",
            isMobileFullscreen && "inset-0 h-dvh w-full rounded-none",
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : isDesktop
                ? "-translate-y-1 scale-95 opacity-0"
                : isMobileFullscreen
                  ? "translate-y-2 opacity-0"
                  : "translate-y-full opacity-100",
          )}
          style={usesAnchor ? anchoredStyle : undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b border-slate-100 px-5 py-4",
              isMobileSheet && "pt-5",
              isMobileFullscreen && "pt-[max(1rem,env(safe-area-inset-top))]",
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
              isMobileSheet && MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS,
              isMobileFullscreen &&
                "pb-[max(1rem,env(safe-area-inset-bottom))]",
            )}
          >
            {children}
          </div>
        </section>
      </div>
    </ModalPortal>
  )
}
