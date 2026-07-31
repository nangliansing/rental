import { useState } from "react"
import {
  AlertCircle,
  Ban,
  Building2,
  Clock3,
  Flag,
  MessageSquareWarning,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { cn } from "@/lib/utils"
import { LoginRequired } from "@/shared/components/auth/LoginRequired"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { SuspensionActionProvider, useSuspensionAction } from "../suspension"
import { BuildingEditsTab } from "../tabs/building-edits"
import { PendingListingsTab } from "../tabs/pending-listings"
import { PlatformAdminsTab } from "../tabs/platform-admins"
import { ReportedListingsTab } from "../tabs/reported-listings"
import { ReportedReviewsTab } from "../tabs/reported-reviews"
import { SuspensionsTab } from "../tabs/suspensions"

type AdminTab =
  | "pending"
  | "buildingEdits"
  | "reports"
  | "reviewReports"
  | "suspensions"
  | "platformAdmins"

const tabs: {
  key: AdminTab
  label: string
  icon: typeof Clock3
  isReady: boolean
}[] = [
  { key: "pending", label: "Pending listings", icon: Clock3, isReady: true },
  {
    key: "buildingEdits",
    label: "Building edits",
    icon: Building2,
    isReady: true,
  },
  { key: "reports", label: "Reported listings", icon: Flag, isReady: true },
  {
    key: "reviewReports",
    label: "Reported reviews",
    icon: MessageSquareWarning,
    isReady: true,
  },
  { key: "suspensions", label: "Suspensions", icon: Ban, isReady: true },
  {
    key: "platformAdmins",
    label: "Administrators",
    icon: UsersRound,
    isReady: true,
  },
]

function isAdminRole(role: string | undefined) {
  return role === "OWNER" || role === "ADMIN"
}

export function AdminPanelPage() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AdminLoading />
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-white px-4 pb-24 pt-6 text-slate-950 lg:pb-10">
        <LoginRequired
          title="Admin sign in required"
          description="Sign in with an owner or admin account to review platform submissions."
          loginHref="/login?redirect=/admin"
          secondaryHref="/"
          secondaryLabel="Back to map"
        />
      </main>
    )
  }

  if (!isAdminRole(user?.role)) {
    return <AdminForbidden />
  }

  return (
    <SuspensionActionProvider>
      <AdminPanelWorkspace user={user} />
    </SuspensionActionProvider>
  )
}

function AdminPanelWorkspace({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>
}) {
  const { openSuspensionDialog } = useSuspensionAction()
  const [activeTab, setActiveTab] = useState<AdminTab>("pending")
  const isAdmin = isAdminRole(user.role)

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <LargeScreenOnly />

      <div className="hidden h-screen overflow-hidden lg:block">
        <div className="flex h-screen flex-col overflow-hidden pt-6">
          <header className="shrink-0 flex items-end justify-between border-b border-slate-200 px-6 pb-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                Admin panel
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Review center
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review submitted buildings and listings before they appear on
                the platform.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              {user.role}
            </div>
          </header>

          <nav className="shrink-0 flex gap-2 border-b border-slate-200 px-6 py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                    isActive
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    !tab.isReady && "opacity-60",
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {!tab.isReady && (
                    <span className="text-xs opacity-80">Later</span>
                  )}
                </button>
              )
            })}
          </nav>

          {activeTab === "pending" && (
            <PendingListingsTab
              enabled={isAdmin}
              currentUserId={user._id}
              onSuspendUser={openSuspensionDialog}
            />
          )}

          {activeTab === "buildingEdits" && (
            <BuildingEditsTab enabled={isAdmin} />
          )}

          {activeTab === "reports" && (
            <ReportedListingsTab
              enabled={isAdmin}
              currentUserId={user._id}
              onSuspendUser={openSuspensionDialog}
            />
          )}

          {activeTab === "reviewReports" && (
            <ReportedReviewsTab
              enabled={isAdmin}
              currentUserId={user._id}
              onSuspendUser={openSuspensionDialog}
            />
          )}

          {activeTab === "suspensions" && <SuspensionsTab enabled={isAdmin} />}

          {activeTab === "platformAdmins" && (
            <PlatformAdminsTab enabled={isAdmin} currentUserRole={user.role} />
          )}
        </div>
      </div>
    </main>
  )
}

function LargeScreenOnly() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center lg:hidden">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <ShieldCheck className="h-6 w-6 text-slate-600" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Use a larger screen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Admin review needs room for photos, building data, listing details,
          and approval actions.
        </p>
      </div>
    </div>
  )
}

function AdminLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-slate-950">
      <div className="text-center">
        <LoaderIcon className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Checking admin access...
        </p>
      </div>
    </main>
  )
}

function AdminForbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 pb-24 text-slate-950">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <AlertCircle className="h-6 w-6 text-slate-600" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This area is only available to platform owners and admins.
        </p>
      </div>
    </main>
  )
}
