import { LogOut, Settings, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
    DialogDescription,
    DialogShell,
    DialogTitle,
} from "@/shared/components/dialogs/DialogShell"

type MyProfileSettingsModalProps = {
    isLoggingOut: boolean
    logoutError?: string
    onClose: () => void
    onLogout: () => void | Promise<void>
    onLogoutReset?: () => void
}

type SettingsView = "menu" | "logout-confirm"

export function MyProfileSettingsModal({
    isLoggingOut,
    logoutError,
    onClose,
    onLogout,
    onLogoutReset,
}: MyProfileSettingsModalProps) {
    const [view, setView] = useState<SettingsView>("menu")
    return (
        <DialogShell
            isOpen
            isDismissDisabled={isLoggingOut}
            onDismiss={onClose}
            contentClassName="max-w-sm rounded-2xl p-4 text-left"
        >
                    {view === "menu" ? (
                        <SettingsMenu
                            onClose={onClose}
                            onRequestLogout={() => {
                                onLogoutReset?.()
                                setView("logout-confirm")
                            }}
                        />
                    ) : (
                        <LogoutConfirmation
                            isLoggingOut={isLoggingOut}
                            error={logoutError}
                            onCancel={() => setView("menu")}
                            onLogout={onLogout}
                        />
                    )}
        </DialogShell>
    )
}

function SettingsMenu({
    onClose,
    onRequestLogout,
}: {
    onClose: () => void
    onRequestLogout: () => void
}) {
    return (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        <Settings className="h-5 w-5" />
                    </div>

                    <div>
                        <DialogTitle
                            className="text-base font-semibold text-slate-950"
                        >
                            Profile settings
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-sm leading-5 text-slate-500">
                            Manage account actions for this profile.
                        </DialogDescription>
                    </div>
                </div>

                <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                    aria-label="Close profile settings"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-5">
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    onClick={onRequestLogout}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Log out
                </button>
            </div>
        </>
    )
}

function LogoutConfirmation({
    isLoggingOut,
    error,
    onCancel,
    onLogout,
}: {
    isLoggingOut: boolean
    error?: string
    onCancel: () => void
    onLogout: () => void | Promise<void>
}) {
    return (
        <>
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <LogOut className="h-5 w-5" />
                </div>

                <div>
                    <DialogTitle
                        className="text-base font-semibold text-slate-950"
                    >
                        Log out?
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-5 text-slate-500">
                        You will need to sign in again to manage your listings.
                    </DialogDescription>
                </div>
            </div>

            {error && (
                <p
                    className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                    role="alert"
                >
                    {error}
                </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    className="h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    disabled={isLoggingOut}
                    onClick={onCancel}
                >
                    Cancel
                </Button>

                <Button
                    type="button"
                    className="h-10 rounded-full bg-red-600 text-white hover:bg-red-700"
                    disabled={isLoggingOut}
                    onClick={onLogout}
                >
                    {isLoggingOut ? "Logging out..." : "Log out"}
                </Button>
            </div>
        </>
    )
}
