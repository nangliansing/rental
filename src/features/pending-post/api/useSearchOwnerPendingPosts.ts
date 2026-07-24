import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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

export function useSearchOwnerPendingPosts({
  status = "all",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerPendingPostsInput = {}) {
  return useInfiniteQuery({
    queryKey: ownerPendingPostsQueryKey({ status, limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchOwnerPendingPosts({
        status,
        page: Number(pageParam),
        limit,
        signal,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination;
      const loaded = page * limit;

      return loaded < total ? page + 1 : undefined;
    },
  });
}
