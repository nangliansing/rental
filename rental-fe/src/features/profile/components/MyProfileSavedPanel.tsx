import { SavedListingsPanel } from "@/features/saved-listing/components"

export function MyProfileSavedPanel() {
  return (
    <div className="mt-8 bg-white">
      <SavedListingsPanel layout="profile" />
    </div>
  )
}
