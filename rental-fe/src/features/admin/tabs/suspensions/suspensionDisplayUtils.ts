import type {
  AdminSuspensionListItem,
  AdminSuspensionStatus,
} from "../../api"

export function getSuspensionUserName(suspension: AdminSuspensionListItem) {
  return suspension.user?.name ?? suspension.user?.email ?? "Suspended user"
}

export function getEffectiveSuspensionStatus(
  suspension: AdminSuspensionListItem,
): AdminSuspensionStatus {
  if (
    suspension.status === "ACTIVE" &&
    new Date(suspension.expiresAt).getTime() <= Date.now()
  ) {
    return "EXPIRED"
  }

  return suspension.status
}
