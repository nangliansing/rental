import type { ClientRequestStatus } from "@/features/client-request/api"
import { cn } from "@/lib/utils"

import { getClientRequestStatusBadgeClassName } from "./clientRequestDetailDisplay"
import { CLIENT_REQUEST_STATUS_LABEL } from "./clientRequestStatusUi"

type ClientRequestStatusBadgeProps = {
  status: ClientRequestStatus
  className?: string
}

export function ClientRequestStatusBadge({
  status,
  className,
}: ClientRequestStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold",
        getClientRequestStatusBadgeClassName(status),
        className,
      )}
    >
      {CLIENT_REQUEST_STATUS_LABEL[status]}
    </span>
  )
}
