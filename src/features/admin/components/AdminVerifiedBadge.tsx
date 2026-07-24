import { BadgeCheck } from "lucide-react"

export function AdminVerifiedBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center"
      aria-label="Verified profile"
      title="Verified profile"
    >
      <BadgeCheck
        className="h-4 w-4 fill-[#1d9bf0] text-white"
        strokeWidth={3}
      />
    </span>
  )
}
