import {
  AdminReviewListItem,
} from "../../components"
import { formatDate } from "../../shared/adminFormatters"
import type { AdminSuspensionListItem } from "../../api"
import {
  getEffectiveSuspensionStatus,
  getSuspensionUserName,
} from "./suspensionDisplayUtils"
import { useSuspensionReview } from "./SuspensionReviewContext"

export function SuspensionListItem({
  suspension,
}: {
  suspension: AdminSuspensionListItem
}) {
  const { selectedSuspension, selectSuspension } = useSuspensionReview()
  const status = getEffectiveSuspensionStatus(suspension)

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
  )
}
