import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination";
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination";

import {
  searchOwnerPendingPosts,
  type OwnerPendingPostStatusFilter,
} from "./searchOwnerPendingPosts";

export const ownerPendingPostsQueryKey = ({
  status,
  limit,
}: {
  status: OwnerPendingPostStatusFilter;
  limit: number;
}) => queryKeys.pendingPosts.ownerList({ status, limit });

type UseSearchOwnerPendingPostsInput = {
  status?: OwnerPendingPostStatusFilter;
  limit?: number;
  enabled?: boolean;
};

export const ownerPendingPostsQueryOptions = ({
  status = "all",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerPendingPostsInput = {}) =>
  infiniteQueryOptions({
    queryKey: ownerPendingPostsQueryKey({ status, limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchOwnerPendingPosts({
        status,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  });

export function useSearchOwnerPendingPosts({
  status = "all",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerPendingPostsInput = {}) {
  return useInfiniteQuery(
    ownerPendingPostsQueryOptions({ status, limit, enabled }),
  );
}
