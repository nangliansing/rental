import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  getAdminUserById,
  searchAdminPlatformAdmins,
  useRemoveAdminRole,
  type AdminUserDetails,
} from "../../api"
import { AdminWorkspace } from "../../components"
import { AdminDetailState } from "../../components/AdminDetailState"
import {
  AdminEmptyState,
  AdminListState,
} from "../../components/AdminListState"
import { getNextAdminPageParam } from "../../shared/adminPagination"
import { PlatformAdminDetail } from "./PlatformAdminDetail"
import { PlatformAdminListItem } from "./PlatformAdminListItem"
import {
  PlatformAdminReviewContext,
  type PlatformAdminReviewContextValue,
  type RemoveAdminRoleAction,
} from "./PlatformAdminReviewContext"
import { RemoveAdminRoleDialog } from "./RemoveAdminRoleDialog"

export type PlatformAdminsTabProps = {
  enabled: boolean
  currentUserRole?: string
}

export function PlatformAdminsTab({
  enabled,
  currentUserRole,
}: PlatformAdminsTabProps) {
  const [selectedPlatformAdminId, setSelectedPlatformAdminId] = useState<
    string | null
  >(null)
  const [removeAdminRoleAction, setRemoveAdminRoleAction] =
    useState<RemoveAdminRoleAction>(null)
  const [removeAdminRoleError, setRemoveAdminRoleError] = useState<
    string | null
  >(null)

  const platformAdminsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.platformAdmins.list,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminPlatformAdmins({
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled,
  })

  const removeAdminRoleMutation = useRemoveAdminRole()

  const platformAdmins =
    platformAdminsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pagination = platformAdminsQuery.data?.pages[0]?.pagination
  const selectedPlatformAdminListItem =
    platformAdmins.find((admin) => admin._id === selectedPlatformAdminId) ??
    platformAdmins[0] ??
    null
  const effectivePlatformAdminId =
    selectedPlatformAdminId ?? selectedPlatformAdminListItem?._id

  const platformAdminDetailQuery = useQuery({
    queryKey: queryKeys.admin.users.detail(effectivePlatformAdminId),
    queryFn: () => getAdminUserById(effectivePlatformAdminId!),
    enabled: enabled && Boolean(effectivePlatformAdminId),
  })

  const selectedPlatformAdmin: AdminUserDetails | null =
    platformAdminDetailQuery.data ??
    (selectedPlatformAdminListItem
      ? {
          ...selectedPlatformAdminListItem,
          agentProfile: null,
        }
      : null)

  const closeRemoveAdminRoleDialog = () => {
    setRemoveAdminRoleAction(null)
    setRemoveAdminRoleError(null)
  }

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

  const contextValue: PlatformAdminReviewContextValue = {
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
    <PlatformAdminReviewContext.Provider value={contextValue}>
      <AdminWorkspace
        title="Administrators"
        description="Review platform staff accounts and their agent profile if they have one."
        total={pagination?.total}
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
            onFetchNextPage={() => void platformAdminsQuery.fetchNextPage()}
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
              <PlatformAdminDetail
                admin={selectedPlatformAdmin}
                currentUserRole={currentUserRole}
              />
            ) : (
              <AdminEmptyState
                title="Select an account"
                description="Choose an administrator from the left to inspect account details."
              />
            )}
          </AdminDetailState>
        }
      />
      <RemoveAdminRoleDialog />
    </PlatformAdminReviewContext.Provider>
  )
}
