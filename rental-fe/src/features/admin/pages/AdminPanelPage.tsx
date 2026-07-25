import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  AlertCircle,
  Ban,
  Building2,
  Clock3,
  Flag,
  Loader2,
  MessageSquareWarning,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { LoginRequired } from "@/shared/components/auth/LoginRequired"
import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import {
  AdminDetailPanel as DetailPanel,
  AdminEmptyState,
  AdminDetailState,
  AdminInfoRow as InfoRow,
  AdminListerCard,
  AdminListState,
  AdminReviewListItem,
  AdminUserCard,
  AdminWorkspace,
} from "../components"
import {
  getAdminUserById,
  searchAdminPlatformAdmins,
  useRemoveAdminRole,
  type AdminPlatformAdmin,
  type AdminUserDetails,
} from "../api"
import { SuspensionActionProvider, useSuspensionAction } from "../suspension"
import { formatDate } from "../shared/adminFormatters"
import { getNextAdminPageParam } from "../shared/adminPagination"
import { BuildingEditsTab } from "../tabs/building-edits"
import { PendingListingsTab } from "../tabs/pending-listings"
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
type RemoveAdminRoleAction = AdminUserDetails | null

type PlatformAdminContextValue = {
  selectedAdmin: AdminUserDetails | null
  action: RemoveAdminRoleAction
  error: string | null
  isSubmitting: boolean
  selectAdmin: (adminId: string | null) => void
  openRemoveAdminDialog: (admin: AdminUserDetails) => void
  closeRemoveAdminDialog: () => void
  confirmRemoveAdmin: () => void
}

const PlatformAdminContext = createContext<PlatformAdminContextValue | null>(
  null,
)

function useRequiredContext<T>(context: T | null, name: string) {
  if (!context) {
    throw new Error(`${name} must be used inside AdminPanelPage`)
  }

  return context
}

function usePlatformAdminReview() {
  return useRequiredContext(
    useContext(PlatformAdminContext),
    "PlatformAdminContext",
  )
}

function PlatformAdminProvider({
  value,
  children,
}: {
  value: PlatformAdminContextValue
  children: ReactNode
}) {
  return (
    <PlatformAdminContext.Provider value={value}>
      {children}
    </PlatformAdminContext.Provider>
  )
}

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
  const [selectedPlatformAdminId, setSelectedPlatformAdminId] = useState<
    string | null
  >(null)
  const [removeAdminRoleAction, setRemoveAdminRoleAction] =
    useState<RemoveAdminRoleAction>(null)
  const [removeAdminRoleError, setRemoveAdminRoleError] = useState<
    string | null
  >(null)
  const isAdmin = isAdminRole(user.role)

  const platformAdminsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.platformAdmins.list,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminPlatformAdmins({
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled: activeTab === "platformAdmins" && isAdmin,
  })

  const closeRemoveAdminRoleDialog = () => {
    setRemoveAdminRoleAction(null)
    setRemoveAdminRoleError(null)
  }

  const removeAdminRoleMutation = useRemoveAdminRole()

  const platformAdmins =
    platformAdminsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const platformAdminsPagination =
    platformAdminsQuery.data?.pages[0]?.pagination
  const selectedPlatformAdminListItem =
    platformAdmins.find((admin) => admin._id === selectedPlatformAdminId) ??
    platformAdmins[0] ??
    null
  const effectivePlatformAdminId =
    selectedPlatformAdminId ?? selectedPlatformAdminListItem?._id
  const platformAdminDetailQuery = useQuery({
    queryKey: queryKeys.admin.users.detail(effectivePlatformAdminId),
    queryFn: () => getAdminUserById(effectivePlatformAdminId!),
    enabled:
      activeTab === "platformAdmins" &&
      isAdmin &&
      Boolean(effectivePlatformAdminId),
  })
  const selectedPlatformAdmin: AdminUserDetails | null =
    platformAdminDetailQuery.data ??
    (selectedPlatformAdminListItem
      ? {
          ...selectedPlatformAdminListItem,
          agentProfile: null,
        }
      : null)

  const handleOpenRemoveAdminRoleDialog = (admin: AdminUserDetails) => {
    setRemoveAdminRoleAction(admin)
    setRemoveAdminRoleError(null)
  }

  const handleConfirmRemoveAdminRole = () => {
    if (!removeAdminRoleAction || removeAdminRoleMutation.isPending) return

    removeAdminRoleMutation.mutate(
      { userId: removeAdminRoleAction._id },
      {
        onSuccess: () => {
          closeRemoveAdminRoleDialog()
          setSelectedPlatformAdminId(null)
        },
        onError: (error) => {
          setRemoveAdminRoleError(
            error instanceof Error
              ? error.message
              : "Could not remove admin access.",
          )
        },
      },
    )
  }

  const platformAdminContextValue: PlatformAdminContextValue = {
    selectedAdmin: selectedPlatformAdmin,
    action: removeAdminRoleAction,
    error: removeAdminRoleError,
    isSubmitting: removeAdminRoleMutation.isPending,
    selectAdmin: setSelectedPlatformAdminId,
    openRemoveAdminDialog: handleOpenRemoveAdminRoleDialog,
    closeRemoveAdminDialog: closeRemoveAdminRoleDialog,
    confirmRemoveAdmin: handleConfirmRemoveAdminRole,
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PlatformAdminProvider value={platformAdminContextValue}>
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
              <AdminWorkspace
                title="Administrators"
                description="Review platform staff accounts and their agent profile if they have one."
                total={platformAdminsPagination?.total}
                list={
                  <AdminListState
                    isLoading={platformAdminsQuery.isLoading}
                    error={platformAdminsQuery.error}
                    errorFallback="Could not load administrators."
                    isEmpty={platformAdmins.length === 0}
                    emptyTitle="No administrators found"
                    emptyDescription="Admin and owner accounts will appear here."
                    onRetry={() => void platformAdminsQuery.refetch()}
                    hasNextPage={Boolean(platformAdminsQuery.hasNextPage)}
                    isFetchingNextPage={platformAdminsQuery.isFetchingNextPage}
                    onFetchNextPage={() =>
                      void platformAdminsQuery.fetchNextPage()
                    }
                  >
                    {platformAdmins.map((admin) => (
                      <PlatformAdminListItem key={admin._id} admin={admin} />
                    ))}
                  </AdminListState>
                }
                detail={
                  <AdminDetailState
                    isLoading={platformAdminDetailQuery.isLoading}
                    shouldShowLoading={Boolean(effectivePlatformAdminId)}
                    error={platformAdminDetailQuery.error}
                    errorFallback="Could not load this account."
                    onRetry={() => void platformAdminDetailQuery.refetch()}
                  >
                    {selectedPlatformAdmin ? (
                      <PlatformAdminDetail admin={selectedPlatformAdmin} />
                    ) : (
                      <AdminEmptyState
                        title="Select an account"
                        description="Choose an administrator from the left to inspect account details."
                      />
                    )}
                  </AdminDetailState>
                }
              />
            )}
          </div>
        </div>

        <RemoveAdminRoleDialog />
      </PlatformAdminProvider>
    </main>
  )
}

function PlatformAdminListItem({
  admin,
}: {
  admin: AdminPlatformAdmin
}) {
  const { selectedAdmin, selectAdmin } = usePlatformAdminReview()

  return (
    <AdminReviewListItem
      title={admin.name}
      meta={[admin.email, `${admin.status} · ${admin.role}`]}
      createdAt={formatDate(admin.createdAt)}
      isSelected={selectedAdmin?._id === admin._id}
      onSelect={() => selectAdmin(admin._id)}
      rightText={admin.role}
    />
  )
}

function PlatformAdminDetail({
  admin,
}: {
  admin: AdminUserDetails
}) {
  const { user } = useAuth()
  const { isSubmitting, openRemoveAdminDialog } = usePlatformAdminReview()
  const canRemoveAdminRole = user?.role === "OWNER" && admin.role === "ADMIN"

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {admin.name}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {admin.role}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Joined {formatDate(admin.createdAt)}
          </p>
        </div>

        {canRemoveAdminRole && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => openRemoveAdminDialog(admin)}
          >
            Remove admin
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Account">
          <AdminUserCard
            name={admin.name}
            subtitle={admin.email}
            meta={`${admin.status} · ${admin.authProvider}`}
          />
        </DetailPanel>

        <DetailPanel title="Access">
          <InfoRow label="Role" value={admin.role} />
          <InfoRow label="Status" value={admin.status} />
          <InfoRow label="Auth provider" value={admin.authProvider} />
          <InfoRow label="Updated at" value={formatDate(admin.updatedAt)} />
        </DetailPanel>
      </div>

      <DetailPanel title="Agent profile">
        {admin.agentProfile ? (
          <AdminListerCard
            name={admin.agentProfile.displayName ?? admin.name}
            subtitle={`${admin.name} · ${admin.email}`}
            meta={`${admin.agentProfile.isOnline ? "ONLINE" : "OFFLINE"} · ${
              admin.agentProfile.isDeleted ? "DELETED" : "VISIBLE"
            }`}
            profile={admin.agentProfile}
          />
        ) : (
          <p className="text-sm text-slate-500">
            This account does not have an agent profile.
          </p>
        )}
      </DetailPanel>
    </article>
  )
}

function RemoveAdminRoleDialog() {
  const {
    action,
    error,
    isSubmitting,
    closeRemoveAdminDialog,
    confirmRemoveAdmin,
  } = usePlatformAdminReview()

  if (!action) return null

  return (
    <ReasonNoteDialog
      isOpen
      title="Remove admin access"
      description="This changes the account role from admin to normal user. They will no longer be able to access platform review tools."
      icon={<AlertCircle className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <div>
          <p className="truncate text-sm font-semibold text-slate-950">
            {action.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{action.email}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current role · {action.role}
          </p>
        </div>
      }
      note=""
      showNoteField={false}
      error={error}
      confirmLabel="Remove admin"
      isSubmitting={isSubmitting}
      canSubmit={!isSubmitting}
      onNoteChange={() => undefined}
      onCancel={closeRemoveAdminDialog}
      onSubmit={confirmRemoveAdmin}
    />
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
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
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
