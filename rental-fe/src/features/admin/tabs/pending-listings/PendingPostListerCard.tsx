import {
  AdminDetailPanel as DetailPanel,
  AdminListerCard,
} from "../../components"
import type { AdminListerCardProfile } from "../../components"

export function PendingPostListerCard({
  name,
  subtitle,
  meta,
  profile,
  userId,
  userStatus,
  onSuspendUser,
}: {
  name: string
  subtitle?: string
  meta?: string
  profile?: AdminListerCardProfile
  userId?: string
  userStatus?: string
  onSuspendUser: (target: { userId: string; name: string }) => void
}) {
  return (
    <AdminListerCard
      name={name}
      subtitle={subtitle}
      meta={meta}
      profile={profile}
      suspendTarget={
        userId
          ? {
              userId,
              isSuspended: userStatus === "SUSPENDED",
            }
          : undefined
      }
      onSuspend={onSuspendUser}
    />
  )
}

export function PendingPostListerPanel({
  name,
  subtitle,
  meta,
  profile,
  userId,
  userStatus,
  onSuspendUser,
}: {
  name: string
  subtitle?: string
  meta?: string
  profile?: AdminListerCardProfile
  userId?: string
  userStatus?: string
  onSuspendUser: (target: { userId: string; name: string }) => void
}) {
  return (
    <DetailPanel title="Lister">
      <PendingPostListerCard
        name={name}
        subtitle={subtitle}
        meta={meta}
        profile={profile}
        userId={userId}
        userStatus={userStatus}
        onSuspendUser={onSuspendUser}
      />
    </DetailPanel>
  )
}
