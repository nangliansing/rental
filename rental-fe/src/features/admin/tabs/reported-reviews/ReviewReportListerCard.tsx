import { AdminListerCard, type AdminListerCardProfile } from "../../components"

export function ReviewReportListerCard({
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
