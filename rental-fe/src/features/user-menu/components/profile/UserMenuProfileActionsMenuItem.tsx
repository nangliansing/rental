import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

type UserMenuProfileActionsMenuItemBaseProps = {
  icon: ReactNode
  label: string
  tone?: "neutral" | "danger"
  className?: string
  onSelect: () => void
}

type UserMenuProfileActionsMenuLinkItemProps =
  UserMenuProfileActionsMenuItemBaseProps & {
    to: string
  }

type UserMenuProfileActionsMenuButtonItemProps =
  UserMenuProfileActionsMenuItemBaseProps & {
    to?: never
    isDisabled?: boolean
  }

type UserMenuProfileActionsMenuItemProps =
  | UserMenuProfileActionsMenuLinkItemProps
  | UserMenuProfileActionsMenuButtonItemProps

const itemClassName = (tone: "neutral" | "danger") =>
  cn(
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
    tone === "danger"
      ? "text-rose-600 hover:bg-rose-50"
      : "text-slate-700 hover:bg-slate-50",
  )

export function UserMenuProfileActionsMenuItem(
  props: UserMenuProfileActionsMenuItemProps,
) {
  const { icon, label, tone = "neutral", className, onSelect } = props

  if ("to" in props && props.to) {
    return (
      <Link
        to={props.to}
        role="menuitem"
        className={cn(itemClassName(tone), className)}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
      >
        {icon}
        {label}
      </Link>
    )
  }

  const isDisabled = "isDisabled" in props ? props.isDisabled : false

  return (
    <button
      type="button"
      role="menuitem"
      className={cn(itemClassName(tone), className)}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation()
        if (isDisabled) return
        onSelect()
      }}
    >
      {icon}
      {label}
    </button>
  )
}
