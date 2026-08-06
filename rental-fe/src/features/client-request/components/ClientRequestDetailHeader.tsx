import type { ClientRequest } from "@/features/client-request/api"

import { ClientRequestDetailActionsMenu } from "./ClientRequestDetailActionsMenu"
import { ClientRequestStatusBadge } from "./ClientRequestStatusBadge"

type ClientRequestDetailHeaderProps = {
  clientRequest: ClientRequest
  actionsDisabled?: boolean
  onEditRequest: () => void
  onCloseRequest: () => void
  onDeleteRequest: () => void
}

export function ClientRequestDetailHeader({
  clientRequest,
  actionsDisabled = false,
  onEditRequest,
  onCloseRequest,
  onDeleteRequest,
}: ClientRequestDetailHeaderProps) {
  return (
    <header className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 text-lg font-semibold text-slate-950">
            {clientRequest.name}
          </h2>
          <ClientRequestStatusBadge status={clientRequest.status} />
        </div>
        {clientRequest.description?.trim() ? (
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            {clientRequest.description.trim()}
          </p>
        ) : null}
      </div>

      <ClientRequestDetailActionsMenu
        status={clientRequest.status}
        disabled={actionsDisabled}
        onEditRequest={onEditRequest}
        onCloseRequest={onCloseRequest}
        onDeleteRequest={onDeleteRequest}
      />
    </header>
  )
}
