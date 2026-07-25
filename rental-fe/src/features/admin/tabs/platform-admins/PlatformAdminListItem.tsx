import { AdminReviewListItem } from "../../components"
import { formatDate } from "../../shared/adminFormatters"
import type { AdminPlatformAdmin } from "../../api"
import { usePlatformAdminReview } from "./PlatformAdminReviewContext"

export function PlatformAdminListItem({
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
