import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import {
  DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
  DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
  DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
} from "@/shared/components/menus/dropdownMenuStyles"

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
    tone === "danger"
      ? DROPDOWN_MENU_ITEM_DANGER_CLASSNAME
      : DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
    DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME,
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
