import { ListingCollectionMessage } from "@/shared/components/collections/ListingCollectionState"

type UserMenuFollowedBuildingsErrorProps = {
  onRetry?: () => void
}

export function UserMenuFollowedBuildingsError({
  onRetry,
}: UserMenuFollowedBuildingsErrorProps) {
  return (
    <ListingCollectionMessage
      className="mt-3 min-h-32 py-6"
      title="Could not load followed buildings"
      description="Please try again in a moment."
      onRetry={onRetry}
    />
  )
}
