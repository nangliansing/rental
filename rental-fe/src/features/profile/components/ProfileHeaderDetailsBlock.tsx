import type { ProfileContactChip } from "../utils/buildProfileContactChips"
import { PROFILE_DETAILS_CONTENT_CLASS } from "../utils/profileLayoutStyles"
import { ProfileContactChips } from "./ProfileContactChips"
import { ProfileDetails } from "./ProfileOverviewPrimitives"

type ProfileHeaderDetailsBlockProps = {
  contacts: readonly ProfileContactChip[]
  createdAt?: string | null
  description?: string | null
  languages?: readonly string[] | null
  emptyBioLabel?: string | null
  align?: "center" | "start"
}

export function ProfileHeaderDetailsBlock({
  contacts,
  createdAt,
  description,
  languages,
  emptyBioLabel = "No bio added yet.",
  align = "start",
}: ProfileHeaderDetailsBlockProps) {
  return (
    <div className={PROFILE_DETAILS_CONTENT_CLASS}>
      <ProfileDetails
        createdAt={createdAt}
        description={description}
        languages={languages}
        emptyBioLabel={emptyBioLabel}
        align={align}
      />
      <ProfileContactChips contacts={contacts} />
    </div>
  )
}
