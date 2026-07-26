import { Clock3 } from "lucide-react"
import { useMemo, useState } from "react"

import type { PendingPost } from "@/features/pending-post"
import { useSearchOwnerPendingPosts } from "@/features/pending-post"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import { MyProfileEmptyState } from "./MyProfileEmptyState"
import { MyProfilePendingCard } from "./MyProfilePendingCard"
import { PendingPostDetailOverlay } from "./PendingPostDetailOverlay"
import type { MyProfilePendingFilter } from "./MyProfileListingTabs"
import { ProfileTabPanel } from "./ProfileTabPanel"
import {
  OWNER_PENDING_STATUS_BY_PROFILE_FILTER,
  PENDING_EMPTY_COPY,
} from "../utils/pendingPostDisplayUtils"
import { PROFILE_TAB_CONTENT_TOP_CLASS } from "../utils/profileLayoutStyles"

type MyProfilePendingPanelProps = {
  filter: MyProfilePendingFilter
  onPendingPostDeleted?: (post: PendingPost) => void
}

export function MyProfilePendingPanel({
  filter,
  onPendingPostDeleted,
}: MyProfilePendingPanelProps) {
  const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null)
  const pendingPostsQuery = useSearchOwnerPendingPosts({
    status: OWNER_PENDING_STATUS_BY_PROFILE_FILTER[filter],
  })

  const pendingPosts = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: pendingPostsQuery.data,
      getItems: (page) => page.data ?? [],
      getKey: (post) => post._id,
    })
  }, [pendingPostsQuery.data])

  if (pendingPostsQuery.isLoading) {
    return (
      <ListingCollectionSkeleton className={PROFILE_TAB_CONTENT_TOP_CLASS} />
    )
  }

  if (pendingPostsQuery.isError) {
    return (
      <ListingCollectionMessage
        className={PROFILE_TAB_CONTENT_TOP_CLASS}
        title="Could not load submissions"
        description="Please try again in a moment."
        onRetry={() => void pendingPostsQuery.refetch()}
      />
    )
  }

  if (pendingPosts.length === 0) {
    const copy = PENDING_EMPTY_COPY[filter]

    return (
      <MyProfileEmptyState
        icon={Clock3}
        title={copy.title}
        description={copy.description}
        action={copy.action}
      />
    )
  }

  return (
    <ProfileTabPanel>
      <ListingCardGrid
        hasNextPage={Boolean(pendingPostsQuery.hasNextPage)}
        isFetchingNextPage={pendingPostsQuery.isFetchingNextPage}
        isFetchNextPageError={pendingPostsQuery.isFetchNextPageError}
        onFetchNextPage={() => void pendingPostsQuery.fetchNextPage()}
        endMessage="No more submissions"
      >
        {pendingPosts.map((post) => (
          <MyProfilePendingCard
            key={post._id}
            post={post}
            onOpen={() => setSelectedPost(post)}
          />
        ))}
      </ListingCardGrid>

      <PendingPostDetailOverlay
        key={selectedPost?._id ?? "empty"}
        post={selectedPost}
        onDeleted={(post) => {
          onPendingPostDeleted?.(post)
          setSelectedPost(null)
        }}
        onClose={() => setSelectedPost(null)}
      />
    </ProfileTabPanel>
  )
}
