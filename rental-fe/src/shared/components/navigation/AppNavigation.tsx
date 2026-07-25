// src/shared/components/navigation/AppNavigation.tsx
import { Home, User } from "lucide-react"
import { NavLink } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { LogoutButton } from "@/features/auth/components/LogoutButton"
import { NotificationBellButton } from "@/features/notifications"
import { SavedListingsButton } from "@/features/saved-listing/components/SavedListingsButton"
import { cn } from "@/lib/utils"

const navItems = [
    {
        label: "Home",
        to: "/",
        icon: Home,
    },
    {
        label: "Profile",
        to: "/profile",
        icon: User,
    },
]

const MOBILE_NAV_ACTIVE_CLASS = "font-semibold text-blue-600"
const MOBILE_NAV_INACTIVE_CLASS = "font-medium text-slate-400"

function MobileNavLink({ item }: { item: (typeof navItems)[number] }) {
    const Icon = item.icon

    return (
        <NavLink
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
                cn(
                    "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                    isActive ? MOBILE_NAV_ACTIVE_CLASS : MOBILE_NAV_INACTIVE_CLASS,
                )
            }
        >
            <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            <span>{item.label}</span>
        </NavLink>
    )
}

export function AppNavigation() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const canUsePersonalActions =
        !isLoading && isAuthenticated && user?.status === "ACTIVE"

    return (
        <>
            <nav
                aria-label="Mobile navigation"
                className="fixed bottom-0 left-0 right-0 z-[70] border-t border-slate-200 bg-white md:hidden"
            >
                <div
                    className={cn(
                        "grid h-16",
                        canUsePersonalActions ? "grid-cols-5" : "grid-cols-2"
                    )}
                >
                    <MobileNavLink item={navItems[0]} />
                    {canUsePersonalActions && (
                        <div className="flex items-center justify-center">
                            <SavedListingsButton variant="mobile" />
                        </div>
                    )}
                    {canUsePersonalActions && (
                        <div className="flex items-center justify-center">
                            <NotificationBellButton variant="mobile" />
                        </div>
                    )}
                    <MobileNavLink item={navItems[1]} />
                    {canUsePersonalActions && <LogoutButton variant="mobile" />}
                </div>
            </nav>

            <nav
                aria-label="Primary navigation"
                className="fixed right-4 top-4 z-[70] hidden rounded-full border border-slate-200 bg-white p-1 shadow-lg md:flex"
            >
                {canUsePersonalActions && (
                    <>
                        <SavedListingsButton variant="desktop" />
                        <NotificationBellButton variant="desktop" />
                    </>
                )}
                {navItems.map((item) => {
                    const Icon = item.icon

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium",
                                    isActive
                                        ? "bg-slate-950 text-white"
                                        : "text-slate-600 hover:bg-slate-100"
                                )
                            }
                        >
                            <Icon aria-hidden="true" className="h-4 w-4" />
                            {item.label}
                        </NavLink>
                    )
                })}
                {canUsePersonalActions && <LogoutButton variant="desktop" />}
            </nav>
        </>
    )
}
