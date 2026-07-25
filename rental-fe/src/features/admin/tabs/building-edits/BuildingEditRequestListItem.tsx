import { AdminReviewListItem } from "../../components"
import type { AdminBuildingEditRequest } from "../../api"
import { formatDate } from "../../shared/adminFormatters"
import {
  getBuildingEditRequestMeta,
  getBuildingEditRequestName,
} from "./buildingEditDisplayUtils"
import { useBuildingEditReview } from "./BuildingEditReviewContext"

export function BuildingEditRequestListItem({
  request,
}: {
  request: AdminBuildingEditRequest
}) {
  const { selectedRequest, selectRequest } = useBuildingEditReview()

  return (
    <AdminReviewListItem
      title={getBuildingEditRequestName(request)}
      meta={getBuildingEditRequestMeta(request)}
      createdAt={formatDate(request.createdAt)}
      isSelected={selectedRequest?._id === request._id}
      onSelect={() => selectRequest(request._id)}
      status={request.status}
      note={request.requestReason}
      imageSize="sm"
    />
  )
}
