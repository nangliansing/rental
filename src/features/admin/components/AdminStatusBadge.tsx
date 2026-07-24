import { cn } from "@/lib/utils"

export type AdminStatusBadgeStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "OPEN"
  | "REVIEWED"
  | "DISMISSED"
  | "ACTION_TAKEN"
  | "ACTIVE"
  | "LIFTED"
  | "EXPIRED"

export function AdminStatusBadge({
  status,
}: {
  status: AdminStatusBadgeStatus
}) {
  const className =
    status === "APPROVED" ||
    status === "ACTION_TAKEN" ||
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED" ||
          status === "CANCELED" ||
          status === "DISMISSED" ||
          status === "LIFTED" ||
          status === "EXPIRED"
        ? "bg-red-50 text-red-700"
        : status === "REVIEWED"
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700"

  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  )
}
