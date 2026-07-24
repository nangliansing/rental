import { AdminInfoRow } from "./AdminInfoRow"

export function AdminReviewCard({
  status,
  reviewedAt,
  reviewedBy,
  noteLabel = "Review note",
  note,
}: {
  status: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  noteLabel?: string
  note?: string | null
}) {
  return (
    <>
      <AdminInfoRow label="Status" value={status.replaceAll("_", " ")} />
      <AdminInfoRow
        label="Reviewed at"
        value={reviewedAt ?? "Not reviewed"}
      />
      <AdminInfoRow label="Reviewed by" value={reviewedBy ?? "Not reviewed"} />
      <AdminInfoRow label={noteLabel} value={note?.trim() || "No review note yet"} />
    </>
  )
}
