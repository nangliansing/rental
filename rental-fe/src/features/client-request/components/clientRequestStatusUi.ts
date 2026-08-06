import type { ClientRequestStatus } from "@/features/client-request/api"

/** User-facing status labels (API values stay Waiting / Closed). */
export const CLIENT_REQUEST_STATUS_LABEL: Record<ClientRequestStatus, string> = {
  Waiting: "Active",
  Closed: "Closed",
}

export const CLIENT_REQUEST_STATUS_PILLS: {
  label: string
  value: ClientRequestStatus
}[] = [
  { value: "Waiting", label: CLIENT_REQUEST_STATUS_LABEL.Waiting },
  { value: "Closed", label: CLIENT_REQUEST_STATUS_LABEL.Closed },
]

export const CLIENT_REQUEST_STATUS_COPY: Record<
  ClientRequestStatus,
  {
    subtitle: string
    emptyTitle: string
    emptyDescription: string
  }
> = {
  Waiting: {
    subtitle: "Searches you’re watching for new matches",
    emptyTitle: "No active searches",
    emptyDescription:
      "Save a map search when nothing matches yet — it’ll show up here while you wait for listings.",
  },
  Closed: {
    subtitle: "Searches you’ve stopped watching",
    emptyTitle: "No closed searches",
    emptyDescription:
      "Closed saved searches appear here once you stop watching them.",
  },
}
