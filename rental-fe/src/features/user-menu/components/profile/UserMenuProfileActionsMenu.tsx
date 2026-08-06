import { LogOut, UserPen } from "lucide-react"

import { LogoutConfirmationHost } from "@/features/auth/components/LogoutConfirmationDialog"
import { useLogoutConfirmation } from "@/features/auth/hooks/useLogoutConfirmation"

import { DROPDOWN_MENU_ITEM_ICON_CLASSNAME } from "@/shared/components/menus/dropdownMenuStyles"
import { useUserMenuProfileActionsMenu } from "../../hooks/useUserMenuProfileActionsMenu"
import { UserMenuProfileActionsDropdown } from "./UserMenuProfileActionsDropdown"
import { UserMenuProfileActionsMenuItem } from "./UserMenuProfileActionsMenuItem"
import { UserMenuProfileActionsTrigger } from "./UserMenuProfileActionsTrigger"

type UserMenuProfileActionsMenuProps = {
  onNavigate?: () => void
}

export function UserMenuProfileActionsMenu({
  onNavigate,
}: UserMenuProfileActionsMenuProps) {
  const menu = useUserMenuProfileActionsMenu()
  const logoutConfirmation = useLogoutConfirmation()

  const handleNavigate = () => {
    menu.close()
    onNavigate?.()
  }

  const handleLogoutSelect = () => {
    menu.close()
    logoutConfirmation.openConfirmation()
  }

  return (
    <div className="relative shrink-0">
      <UserMenuProfileActionsTrigger
        ref={menu.triggerRef}
        isOpen={menu.isOpen}
        menuId={menu.menuId}
        isDisabled={logoutConfirmation.isSubmitting}
        onToggle={menu.toggle}
      />

      <UserMenuProfileActionsDropdown
        id={menu.menuId}
        isOpen={menu.isOpen}
        menuRef={menu.menuRef}
      >
        <UserMenuProfileActionsMenuItem
          to="/account/edit"
          icon={
            <UserPen
              aria-hidden="true"
              className={DROPDOWN_MENU_ITEM_ICON_CLASSNAME}
            />
          }
          label="Edit account"
          onSelect={handleNavigate}
        />

        <UserMenuProfileActionsMenuItem
          icon={
            <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" />
          }
          label="Log out"
          tone="danger"
          isDisabled={logoutConfirmation.isSubmitting}
          onSelect={handleLogoutSelect}
        />
      </UserMenuProfileActionsDropdown>

      <LogoutConfirmationHost confirmation={logoutConfirmation} />
    </div>
  )
}
