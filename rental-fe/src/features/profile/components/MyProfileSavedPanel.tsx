import { SavedListingsPanel } from "@/features/saved-listing/components"

import { ProfileTabPanel } from "./ProfileTabPanel"

export function MyProfileSavedPanel() {
  return (
    <ProfileTabPanel>
      <SavedListingsPanel layout="profile" />
    </ProfileTabPanel>
  )
}
