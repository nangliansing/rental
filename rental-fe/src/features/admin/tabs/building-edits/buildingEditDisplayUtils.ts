import type { AdminBuildingEditRequest } from "../../api"

export function getBuildingEditRequestName(request: AdminBuildingEditRequest) {
  const currentName = request.originalBuilding.name
  const proposedName = request.proposedBuilding.name

  if (proposedName && proposedName !== currentName) {
    return `${currentName} → ${proposedName}`
  }

  return request.building?.name ?? currentName
}

export function getBuildingEditRequestAgentName(
  request: AdminBuildingEditRequest,
) {
  return request.agentProfile?.displayName ?? request.requestedBy.name
}

export function getBuildingEditRequestMeta(request: AdminBuildingEditRequest) {
  const proposed = request.proposedBuilding
  const requester = getBuildingEditRequestAgentName(request)

  return [
    `${proposed.buildingType} · ${proposed.address || "No address"}`,
    `Requested by ${requester}`,
  ]
}
