import { useEffect, useRef, useState, type ReactNode } from "react"
import { MoreHorizontal, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DROPDOWN_MENU_CONTENT_CLASSNAME,
  DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
  DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
} from "@/shared/components/menus/dropdownMenuStyles"

type ModerationMoreMenuItem = {
  label: string
  icon: ReactNode
  tone?: "danger" | "neutral"
  onSelect: () => void
}

export function ModerationMoreMenu({
  ariaLabel,
  isDisabled,
  items,
}: {
  ariaLabel: string
  isDisabled?: boolean
  items: ModerationMoreMenuItem[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        disabled={isDisabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-10 z-20",
            DROPDOWN_MENU_CONTENT_CLASSNAME,
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={
                item.tone === "danger"
                  ? DROPDOWN_MENU_ITEM_DANGER_CLASSNAME
                  : DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME
              }
              onClick={() => {
                setIsOpen(false)
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ListingModerationMenu({
  isDisabled,
  onDelete,
}: {
  isDisabled?: boolean
  onDelete: () => void
}) {
  return (
    <ModerationMoreMenu
      ariaLabel="Open listing moderation actions"
      isDisabled={isDisabled}
      items={[
        {
          label: "Delete listing",
          icon: <Trash2 className="h-5 w-5 shrink-0" />,
          tone: "danger",
          onSelect: onDelete,
        },
      ]}
    />
  )
}

export function ReviewModerationMenu({
  isDisabled,
  onDelete,
}: {
  isDisabled?: boolean
  onDelete: () => void
}) {
  return (
    <ModerationMoreMenu
      ariaLabel="Open review moderation actions"
      isDisabled={isDisabled}
      items={[
        {
          label: "Delete this review",
          icon: <Trash2 className="h-5 w-5 shrink-0" />,
          tone: "danger",
          onSelect: onDelete,
        },
      ]}
    />
  )
}
