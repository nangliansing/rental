import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  Ban,
  Building2,
  CheckCircle2,
  Clock3,
  Flag,
  Loader2,
  MessageSquareWarning,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { LoginRequired } from "@/shared/components/auth/LoginRequired";
import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog";

import {
  AdminDetailPanel as DetailPanel,
  AdminEmptyState,
  AdminFilterPills,
  AdminDetailState,
  AdminInfoRow as InfoRow,
  AdminListerCard,
  AdminListState,
  AdminReviewListItem,
  AdminStatusBadge as StatusBadge,
  AdminUserCard,
  AdminWorkspace,
} from "../components";
import {
  getAdminSuspensionById,
  getAdminUserById,
  searchAdminPlatformAdmins,
  searchAdminSuspensions,
  useCreateAdminSuspension,
  useLiftAdminSuspension,
  useRemoveAdminRole,
  type AdminPlatformAdmin,
  type AdminUserDetails,
  type AdminSuspensionStatus,
  type AdminSuspensionListItem,
  type AdminSuspensionStatusFilter,
} from "../api";
import { toSelectableChipOptions } from "../shared/adminChipOptions";
import {
  formatDate,
} from "../shared/adminFormatters";
import { getNextAdminPageParam } from "../shared/adminPagination";
import { BuildingEditsTab } from "../tabs/building-edits";
import { PendingListingsTab } from "../tabs/pending-listings";
import { ReportedListingsTab } from "../tabs/reported-listings";
import { ReportedReviewsTab } from "../tabs/reported-reviews";

type AdminTab =
  | "pending"
  | "buildingEdits"
  | "reports"
  | "reviewReports"
  | "suspensions"
  | "platformAdmins";
type SuspensionAction = {
  userId: string;
  name: string;
} | null;
type LiftSuspensionAction = AdminSuspensionListItem | null;
type RemoveAdminRoleAction = AdminUserDetails | null;

type SuspensionContextValue = {
  selectedSuspension: AdminSuspensionListItem | null;
  action: SuspensionAction;
  liftAction: LiftSuspensionAction;
  reason: string;
  note: string;
  durationDays: number;
  liftReason: string;
  liftNote: string;
  error: string | null;
  liftError: string | null;
  isSubmitting: boolean;
  isLifting: boolean;
  selectSuspension: (suspensionId: string | null) => void;
  openDialog: (action: NonNullable<SuspensionAction>) => void;
  openLiftDialog: (suspension: AdminSuspensionListItem) => void;
  closeDialog: () => void;
  closeLiftDialog: () => void;
  setReason: (value: string) => void;
  setNote: (value: string) => void;
  setDurationDays: (value: number) => void;
  setLiftReason: (value: string) => void;
  setLiftNote: (value: string) => void;
  confirmSuspension: () => void;
  confirmLiftSuspension: () => void;
}

type PlatformAdminContextValue = {
  selectedAdmin: AdminUserDetails | null;
  action: RemoveAdminRoleAction;
  error: string | null;
  isSubmitting: boolean;
  selectAdmin: (adminId: string | null) => void;
  openRemoveAdminDialog: (admin: AdminUserDetails) => void;
  closeRemoveAdminDialog: () => void;
  confirmRemoveAdmin: () => void;
}

const SuspensionContext = createContext<SuspensionContextValue | null>(null);
const PlatformAdminContext = createContext<PlatformAdminContextValue | null>(
  null,
);

function useRequiredContext<T>(context: T | null, name: string) {
  if (!context) {
    throw new Error(`${name} must be used inside AdminPanelPage`);
  }

  return context;
}

function useSuspensionReview() {
  return useRequiredContext(
    useContext(SuspensionContext),
    "SuspensionContext",
  );
}

function usePlatformAdminReview() {
  return useRequiredContext(
    useContext(PlatformAdminContext),
    "PlatformAdminContext",
  );
}

function AdminReviewProviders({
  suspension,
  platformAdmin,
  children,
}: {
  suspension: SuspensionContextValue;
  platformAdmin: PlatformAdminContextValue;
  children: ReactNode;
}) {
  return (
    <SuspensionContext.Provider value={suspension}>
      <PlatformAdminContext.Provider value={platformAdmin}>
        {children}
      </PlatformAdminContext.Provider>
    </SuspensionContext.Provider>
  );
}

const suspensionReasonOptions = [
  "Fake or suspicious lister",
  "Repeated misleading listings",
  "Unresponsive after reports",
  "Inappropriate content",
  "Unsafe or abusive behavior",
  "Platform policy violation",
];

const liftSuspensionReasonOptions = [
  "Issue resolved after review",
  "User provided valid clarification",
  "Suspension was applied by mistake",
  "Required corrections were completed",
  "Report was dismissed after investigation",
  "Admin approved account restoration",
];

const suspensionDurationOptions = [
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

type SelectableChipTone = "neutral" | "red" | "green";
type SelectableChipOption<TValue extends string | number> = {
  label: string;
  value: TValue;
};

const tabs: {
  key: AdminTab;
  label: string;
  icon: typeof Clock3;
  isReady: boolean;
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
];

const suspensionStatusFilters: {
  label: string;
  value?: AdminSuspensionStatusFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Lifted", value: "LIFTED" },
];

function getSuspensionUserName(suspension: AdminSuspensionListItem) {
  return suspension.user?.name ?? suspension.user?.email ?? "Suspended user";
}

function getEffectiveSuspensionStatus(
  suspension: AdminSuspensionListItem,
): AdminSuspensionStatus {
  if (
    suspension.status === "ACTIVE" &&
    new Date(suspension.expiresAt).getTime() <= Date.now()
  ) {
    return "EXPIRED";
  }

  return suspension.status;
}

function isAdminRole(role: string | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export function AdminPanelPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("pending");
  const [suspensionStatus, setSuspensionStatus] =
    useState<AdminSuspensionStatusFilter>("ACTIVE");
  const [selectedSuspensionId, setSelectedSuspensionId] = useState<
    string | null
  >(null);
  const [selectedPlatformAdminId, setSelectedPlatformAdminId] = useState<
    string | null
  >(null);
  const [removeAdminRoleAction, setRemoveAdminRoleAction] =
    useState<RemoveAdminRoleAction>(null);
  const [removeAdminRoleError, setRemoveAdminRoleError] = useState<
    string | null
  >(null);
  const [suspensionAction, setSuspensionAction] =
    useState<SuspensionAction>(null);
  const [liftSuspensionAction, setLiftSuspensionAction] =
    useState<LiftSuspensionAction>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionNote, setSuspensionNote] = useState("");
  const [suspensionDurationDays, setSuspensionDurationDays] = useState(7);
  const [liftSuspensionReason, setLiftSuspensionReason] = useState("");
  const [liftSuspensionNote, setLiftSuspensionNote] = useState("");
  const [suspensionError, setSuspensionError] = useState<string | null>(null);
  const [liftSuspensionError, setLiftSuspensionError] = useState<string | null>(
    null,
  );
  const isAdmin = isAdminRole(user?.role);

  const suspensionsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.suspensions.list(suspensionStatus),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminSuspensions({
        status: suspensionStatus,
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled: activeTab === "suspensions" && isAdmin,
  });

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
  });

  const closeSuspensionDialog = () => {
    setSuspensionAction(null);
    setSuspensionReason("");
    setSuspensionNote("");
    setSuspensionDurationDays(7);
    setSuspensionError(null);
  };

  const suspensionMutation = useCreateAdminSuspension();

  const closeLiftSuspensionDialog = () => {
    setLiftSuspensionAction(null);
    setLiftSuspensionReason("");
    setLiftSuspensionNote("");
    setLiftSuspensionError(null);
  };

  const liftSuspensionMutation = useLiftAdminSuspension();

  const closeRemoveAdminRoleDialog = () => {
    setRemoveAdminRoleAction(null);
    setRemoveAdminRoleError(null);
  };

  const removeAdminRoleMutation = useRemoveAdminRole();

  const suspensions =
    suspensionsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const suspensionsPagination = suspensionsQuery.data?.pages[0]?.pagination;
  const selectedSuspensionListItem =
    suspensions.find((suspension) => suspension._id === selectedSuspensionId) ??
    suspensions[0] ??
    null;
  const effectiveSuspensionId =
    selectedSuspensionId ?? selectedSuspensionListItem?._id;
  const suspensionDetailQuery = useQuery({
    queryKey: queryKeys.admin.suspensions.detail(effectiveSuspensionId),
    queryFn: () => getAdminSuspensionById(effectiveSuspensionId!),
    enabled:
      activeTab === "suspensions" && isAdmin && Boolean(effectiveSuspensionId),
  });
  const selectedSuspension =
    suspensionDetailQuery.data ?? selectedSuspensionListItem ?? null;
  const platformAdmins =
    platformAdminsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const platformAdminsPagination =
    platformAdminsQuery.data?.pages[0]?.pagination;
  const selectedPlatformAdminListItem =
    platformAdmins.find((admin) => admin._id === selectedPlatformAdminId) ??
    platformAdmins[0] ??
    null;
  const effectivePlatformAdminId =
    selectedPlatformAdminId ?? selectedPlatformAdminListItem?._id;
  const platformAdminDetailQuery = useQuery({
    queryKey: queryKeys.admin.users.detail(effectivePlatformAdminId),
    queryFn: () => getAdminUserById(effectivePlatformAdminId!),
    enabled:
      activeTab === "platformAdmins" &&
      isAdmin &&
      Boolean(effectivePlatformAdminId),
  });
  const selectedPlatformAdmin: AdminUserDetails | null =
    platformAdminDetailQuery.data ??
    (selectedPlatformAdminListItem
      ? {
          ...selectedPlatformAdminListItem,
          agentProfile: null,
        }
      : null);

  const handleOpenSuspensionDialog = (
    action: NonNullable<SuspensionAction>,
  ) => {
    setSuspensionAction(action);
    setSuspensionReason("");
    setSuspensionNote("");
    setSuspensionDurationDays(7);
    setSuspensionError(null);
  };

  const handleOpenLiftSuspensionDialog = (
    suspension: AdminSuspensionListItem,
  ) => {
    setLiftSuspensionAction(suspension);
    setLiftSuspensionReason("");
    setLiftSuspensionNote("");
    setLiftSuspensionError(null);
  };

  const handleConfirmSuspension = () => {
    if (!suspensionAction || suspensionMutation.isPending) return;

    const trimmedReason = suspensionReason.trim();
    const trimmedNote = suspensionNote.trim();

    if (!trimmedReason && !trimmedNote) {
      setSuspensionError("Suspension reason is required.");
      return;
    }

    const expiresAt = new Date(
      Date.now() + suspensionDurationDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    suspensionMutation.mutate(
      {
        userId: suspensionAction.userId,
        reason: trimmedReason || trimmedNote,
        note: trimmedReason && trimmedNote ? trimmedNote : undefined,
        expiresAt,
      },
      {
        onSuccess: closeSuspensionDialog,
        onError: (error) => {
          setSuspensionError(
            error instanceof Error ? error.message : "Could not suspend lister.",
          );
        },
      },
    );
  };

  const handleConfirmLiftSuspension = () => {
    if (!liftSuspensionAction || liftSuspensionMutation.isPending) return;

    const trimmedReason = liftSuspensionReason.trim();
    const trimmedNote = liftSuspensionNote.trim();

    if (!trimmedReason && !trimmedNote) {
      setLiftSuspensionError("Lift reason is required.");
      return;
    }

    const liftReason = trimmedReason
      ? [trimmedReason, trimmedNote && `Note: ${trimmedNote}`]
          .filter(Boolean)
          .join("\n\n")
      : trimmedNote;

    liftSuspensionMutation.mutate({
      suspensionId: liftSuspensionAction._id,
      userId: liftSuspensionAction.userId,
      liftReason,
    }, {
      onSuccess: (result) => {
        setSelectedSuspensionId(result.suspension._id);
        closeLiftSuspensionDialog();
      },
      onError: (error) => {
        setLiftSuspensionError(
          error instanceof Error ? error.message : "Could not lift suspension.",
        );
      },
    });
  };

  const handleOpenRemoveAdminRoleDialog = (admin: AdminUserDetails) => {
    setRemoveAdminRoleAction(admin);
    setRemoveAdminRoleError(null);
  };

  const handleConfirmRemoveAdminRole = () => {
    if (!removeAdminRoleAction || removeAdminRoleMutation.isPending) return;

    removeAdminRoleMutation.mutate(
      { userId: removeAdminRoleAction._id },
      {
        onSuccess: () => {
          closeRemoveAdminRoleDialog();
          setSelectedPlatformAdminId(null);
        },
        onError: (error) => {
          setRemoveAdminRoleError(
            error instanceof Error
              ? error.message
              : "Could not remove admin access.",
          );
        },
      },
    );
  };

  const suspensionContextValue: SuspensionContextValue = {
    selectedSuspension,
    action: suspensionAction,
    liftAction: liftSuspensionAction,
    reason: suspensionReason,
    note: suspensionNote,
    durationDays: suspensionDurationDays,
    liftReason: liftSuspensionReason,
    liftNote: liftSuspensionNote,
    error: suspensionError,
    liftError: liftSuspensionError,
    isSubmitting: suspensionMutation.isPending,
    isLifting: liftSuspensionMutation.isPending,
    selectSuspension: setSelectedSuspensionId,
    openDialog: handleOpenSuspensionDialog,
    openLiftDialog: handleOpenLiftSuspensionDialog,
    closeDialog: closeSuspensionDialog,
    closeLiftDialog: closeLiftSuspensionDialog,
    setReason: (value) => {
      setSuspensionReason(value);
      if (suspensionError) setSuspensionError(null);
    },
    setNote: (value) => {
      setSuspensionNote(value);
      if (suspensionError) setSuspensionError(null);
    },
    setDurationDays: setSuspensionDurationDays,
    setLiftReason: (value) => {
      setLiftSuspensionReason(value);
      if (liftSuspensionError) setLiftSuspensionError(null);
    },
    setLiftNote: (value) => {
      setLiftSuspensionNote(value);
      if (liftSuspensionError) setLiftSuspensionError(null);
    },
    confirmSuspension: handleConfirmSuspension,
    confirmLiftSuspension: handleConfirmLiftSuspension,
  };
  const platformAdminContextValue: PlatformAdminContextValue = {
    selectedAdmin: selectedPlatformAdmin,
    action: removeAdminRoleAction,
    error: removeAdminRoleError,
    isSubmitting: removeAdminRoleMutation.isPending,
    selectAdmin: setSelectedPlatformAdminId,
    openRemoveAdminDialog: handleOpenRemoveAdminRoleDialog,
    closeRemoveAdminDialog: closeRemoveAdminRoleDialog,
    confirmRemoveAdmin: handleConfirmRemoveAdminRole,
  };

  if (isLoading) {
    return <AdminLoading />;
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
    );
  }

  if (!isAdmin) {
    return <AdminForbidden />;
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminReviewProviders
        suspension={suspensionContextValue}
        platformAdmin={platformAdminContextValue}
      >
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
              {user?.role}
            </div>
          </header>

          <nav className="shrink-0 flex gap-2 border-b border-slate-200 px-6 py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

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
              );
            })}
          </nav>

          {activeTab === "pending" && (
            <PendingListingsTab
              enabled={isAdmin}
              currentUserId={user?._id}
              onSuspendUser={handleOpenSuspensionDialog}
            />
          )}

          {activeTab === "buildingEdits" && (
            <BuildingEditsTab enabled={isAdmin} />
          )}

          {activeTab === "reports" && (
            <ReportedListingsTab
              enabled={isAdmin}
              currentUserId={user?._id}
              onSuspendUser={handleOpenSuspensionDialog}
            />
          )}

          {activeTab === "reviewReports" && (
            <ReportedReviewsTab
              enabled={isAdmin}
              currentUserId={user?._id}
              onSuspendUser={handleOpenSuspensionDialog}
            />
          )}

          {activeTab === "suspensions" && (
            <AdminWorkspace
              title="Suspensions"
              description="Review active and historical account restrictions."
              total={suspensionsPagination?.total}
              filters={
                <AdminFilterPills
                  options={suspensionStatusFilters}
                  value={suspensionStatus}
                  scrollable
                  onChange={(nextStatus) => {
                    setSuspensionStatus(nextStatus ?? "all");
                    setSelectedSuspensionId(null);
                  }}
                />
              }
              list={
                <AdminListState
                  isLoading={suspensionsQuery.isLoading}
                  error={suspensionsQuery.error}
                  errorFallback="Could not load suspensions."
                  isEmpty={suspensions.length === 0}
                  emptyTitle="No suspensions"
                  emptyDescription="Suspension records will appear here after an admin restricts a lister."
                  onRetry={() => void suspensionsQuery.refetch()}
                  hasNextPage={Boolean(suspensionsQuery.hasNextPage)}
                  isFetchingNextPage={suspensionsQuery.isFetchingNextPage}
                  onFetchNextPage={() => void suspensionsQuery.fetchNextPage()}
                >
                  {suspensions.map((suspension) => (
                    <SuspensionListItem
                      key={suspension._id}
                      suspension={suspension}
                    />
                  ))}
                </AdminListState>
              }
              detail={
                <AdminDetailState
                  isLoading={suspensionDetailQuery.isLoading}
                  shouldShowLoading={Boolean(effectiveSuspensionId)}
                  error={suspensionDetailQuery.error}
                  errorFallback="Could not load this suspension."
                  onRetry={() => void suspensionDetailQuery.refetch()}
                >
                  {selectedSuspension ? (
                    <SuspensionDetail suspension={selectedSuspension} />
                  ) : (
                    <AdminEmptyState
                      title="Select a suspension"
                      description="Choose a suspension record from the left to inspect who was restricted and why."
                    />
                  )}
                </AdminDetailState>
              }
            />
          )}

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

        <SuspensionDialog />
        <LiftSuspensionDialog />
        <RemoveAdminRoleDialog />
      </AdminReviewProviders>
    </main>
  );
}

function SelectableChipGroup<TValue extends string | number>({
  options,
  value,
  disabled,
  tone = "neutral",
  onChange,
}: {
  options: TValue[] | SelectableChipOption<TValue>[];
  value: TValue;
  disabled: boolean;
  tone?: SelectableChipTone;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {toSelectableChipOptions(options).map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={String(option.value)}
            type="button"
            disabled={disabled}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              isSelected
                ? {
                    neutral: "border-slate-950 bg-slate-950 text-white",
                    red: "border-red-600 bg-red-50 text-red-700",
                    green:
                      "border-emerald-600 bg-emerald-50 text-emerald-700",
                  }[tone]
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SuspensionListItem({
  suspension,
}: {
  suspension: AdminSuspensionListItem;
}) {
  const { selectedSuspension, selectSuspension } = useSuspensionReview();
  const status = getEffectiveSuspensionStatus(suspension);

  return (
    <AdminReviewListItem
      title={getSuspensionUserName(suspension)}
      meta={[
        suspension.user?.email ?? "No email",
        `Until ${formatDate(suspension.expiresAt)}`,
      ]}
      createdAt={formatDate(suspension.createdAt)}
      isSelected={selectedSuspension?._id === suspension._id}
      onSelect={() => selectSuspension(suspension._id)}
      status={status}
      note={suspension.reason}
    />
  );
}

function SuspensionDetail({
  suspension,
}: {
  suspension: AdminSuspensionListItem;
}) {
  const { isLifting, openLiftDialog } = useSuspensionReview();
  const status = getEffectiveSuspensionStatus(suspension);
  const user = suspension.user;
  const createdBy = suspension.createdBy;
  const liftedBy = suspension.liftedBy;
  const canLift = status !== "LIFTED";

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {getSuspensionUserName(suspension)}
            </h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Suspended {formatDate(suspension.createdAt)}
            {createdBy ? ` by ${createdBy.name}` : ""}
          </p>
        </div>

        {canLift && (
          <Button
            type="button"
            disabled={isLifting}
            className="shrink-0 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => openLiftDialog(suspension)}
          >
            {isLifting && <Loader2 className="h-4 w-4 animate-spin" />}
            Lift suspension
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Suspended user">
          <AdminUserCard
            name={user?.name ?? "Unknown user"}
            subtitle={user ? `${user.email}` : "No user lookup"}
            meta={user ? `${user.status} · ${user.role}` : undefined}
          />
        </DetailPanel>

        <DetailPanel title="Suspension">
          <InfoRow label="Status" value={status} />
          <InfoRow label="Reason" value={suspension.reason} />
          <InfoRow
            label="Note"
            value={suspension.note?.trim() || "No extra note"}
          />
          <InfoRow label="Starts at" value={formatDate(suspension.startsAt)} />
          <InfoRow label="Expires at" value={formatDate(suspension.expiresAt)} />
        </DetailPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Created by">
          {createdBy ? (
            <AdminUserCard
              name={createdBy.name}
              subtitle={createdBy.email}
              meta={`${createdBy.status} · ${createdBy.role}`}
            />
          ) : (
            <p className="text-sm text-slate-500">
              No creator details were found.
            </p>
          )}
        </DetailPanel>

        <DetailPanel title="Lift details">
          <InfoRow
            label="Lifted at"
            value={suspension.liftedAt ? formatDate(suspension.liftedAt) : "Not lifted"}
          />
          <InfoRow
            label="Lifted by"
            value={liftedBy ? `${liftedBy.name} · ${liftedBy.email}` : "Not lifted"}
          />
          <InfoRow
            label="Lift reason"
            value={suspension.liftReason?.trim() || "No lift reason"}
          />
        </DetailPanel>
      </div>
    </article>
  );
}

function PlatformAdminListItem({
  admin,
}: {
  admin: AdminPlatformAdmin;
}) {
  const { selectedAdmin, selectAdmin } = usePlatformAdminReview();

  return (
    <AdminReviewListItem
      title={admin.name}
      meta={[admin.email, `${admin.status} · ${admin.role}`]}
      createdAt={formatDate(admin.createdAt)}
      isSelected={selectedAdmin?._id === admin._id}
      onSelect={() => selectAdmin(admin._id)}
      rightText={admin.role}
    />
  );
}

function PlatformAdminDetail({
  admin,
}: {
  admin: AdminUserDetails;
}) {
  const { user } = useAuth();
  const { isSubmitting, openRemoveAdminDialog } = usePlatformAdminReview();
  const canRemoveAdminRole = user?.role === "OWNER" && admin.role === "ADMIN";

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
  );
}

function SuspensionDialog() {
  const {
    action,
    reason,
    note,
    durationDays,
    error,
    isSubmitting,
    setReason,
    setNote,
    setDurationDays,
    closeDialog,
    confirmSuspension,
  } = useSuspensionReview();

  if (!action) return null;

  const canSubmit =
    !isSubmitting && (reason.trim().length > 0 || note.trim().length > 0);

  return (
    <ReasonNoteDialog
      isOpen
      title="Suspend lister"
      description="Temporarily restrict this lister from using listing actions."
      icon={<AlertCircle className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <>
          <p className="truncate text-sm font-semibold text-slate-950">
            {action.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This lister is not currently suspended.
          </p>
        </>
      }
      reasonLabel="Suspension reason"
      reasonOptions={toSelectableChipOptions(suspensionReasonOptions)}
      selectedReason={reason}
      reasonActiveColor="red"
      additionalFields={
            <div>
              <p className="text-sm font-semibold text-slate-800">Duration</p>
              <SelectableChipGroup
                options={suspensionDurationOptions}
                value={durationDays}
                disabled={isSubmitting}
                onChange={setDurationDays}
              />
            </div>
      }
      noteLabel="Extra note or custom reason"
      note={note}
      notePlaceholder="Add details for future admins."
      error={error}
      confirmLabel="Suspend lister"
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      onReasonChange={setReason}
      onNoteChange={setNote}
      onCancel={closeDialog}
      onSubmit={confirmSuspension}
    />
  );
}

function LiftSuspensionDialog() {
  const {
    liftAction,
    liftReason,
    liftNote,
    liftError,
    isLifting,
    setLiftReason,
    setLiftNote,
    closeLiftDialog,
    confirmLiftSuspension,
  } = useSuspensionReview();

  if (!liftAction) return null;

  const canSubmit =
    !isLifting && (liftReason.trim().length > 0 || liftNote.trim().length > 0);

  return (
    <ReasonNoteDialog
      isOpen
      title="Lift suspension"
      description="Restore this user account to active status and keep an audit reason for future admins."
      icon={<CheckCircle2 className="h-5 w-5" />}
      tone="green"
      itemSummary={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {getSuspensionUserName(liftAction)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Suspended until {formatDate(liftAction.expiresAt)}
            </p>
          </div>
          <StatusBadge status={getEffectiveSuspensionStatus(liftAction)} />
        </div>
      }
      reasonLabel="Common reason"
      reasonOptions={toSelectableChipOptions(liftSuspensionReasonOptions)}
      selectedReason={liftReason}
      reasonActiveColor="green"
      noteLabel="Extra note or custom reason"
      note={liftNote}
      notePlaceholder="Explain why this suspension can be lifted."
      error={liftError}
      confirmLabel="Lift suspension"
      isSubmitting={isLifting}
      canSubmit={canSubmit}
      onReasonChange={setLiftReason}
      onNoteChange={setLiftNote}
      onCancel={closeLiftDialog}
      onSubmit={confirmLiftSuspension}
    />
  );
}

function RemoveAdminRoleDialog() {
  const {
    action,
    error,
    isSubmitting,
    closeRemoveAdminDialog,
    confirmRemoveAdmin,
  } = usePlatformAdminReview();

  if (!action) return null;

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
  );
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
  );
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
  );
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
  );
}
