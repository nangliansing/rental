import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import type { AdminPendingPostsInfiniteData } from "./adminPendingPostCache";
import type { AdminPendingPost } from "./searchAdminPendingPosts";

const mocks = vi.hoisted(() => ({
  rejectAdminPendingPost: vi.fn(),
}));

vi.mock("./rejectAdminPendingPost", () => ({
  rejectAdminPendingPost: mocks.rejectAdminPendingPost,
}));

import { useRejectAdminPendingPost } from "./useRejectAdminPendingPost";

const post = (id: string, status: AdminPendingPost["status"] = "PENDING") =>
  ({ _id: id, status, reviewNote: null }) as AdminPendingPost;

const data = (...posts: AdminPendingPost[]): AdminPendingPostsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: posts,
      pagination: { page: 1, limit: 20, total: posts.length },
    },
  ],
});

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const allKey = queryKeys.admin.pendingPosts.list(undefined);
  const pendingKey = queryKeys.admin.pendingPosts.list("PENDING");
  const rejectedKey = queryKeys.admin.pendingPosts.list("REJECTED");
  const unrelatedKey = queryKeys.notifications.me;
  queryClient.setQueryData(allKey, data(post("post-1"), post("post-2")));
  queryClient.setQueryData(pendingKey, data(post("post-1"), post("post-2")));
  queryClient.setQueryData(rejectedKey, data(post("old", "REJECTED")));
  queryClient.setQueryData(unrelatedKey, { unread: 2 });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  const hook = renderHook(() => useRejectAdminPendingPost(), {
    wrapper: Wrapper,
  });
  return {
    ...hook,
    allKey,
    pendingKey,
    queryClient,
    rejectedKey,
    unrelatedKey,
  };
}

const posts = (queryClient: QueryClient, queryKey: readonly unknown[]) =>
  queryClient
    .getQueryData<AdminPendingPostsInfiniteData>(queryKey)
    ?.pages.flatMap((page) => page.data);

describe("useRejectAdminPendingPost", () => {
  beforeEach(() => {
    mocks.rejectAdminPendingPost.mockReset();
  });

  it("optimistically transitions all related variants and preserves unrelated data", async () => {
    let resolveRequest!: (value: AdminPendingPost) => void;
    mocks.rejectAdminPendingPost.mockReturnValue(
      new Promise<AdminPendingPost>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result, queryClient, allKey, pendingKey, rejectedKey, unrelatedKey } =
      setup();
    const cancel = vi.spyOn(queryClient, "cancelQueries");

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Incomplete" }),
    );

    await waitFor(() =>
      expect(posts(queryClient, allKey)?.[0]).toMatchObject({
        status: "REJECTED",
        reviewNote: "Incomplete",
      }),
    );
    expect(posts(queryClient, pendingKey)?.map((item) => item._id)).toEqual([
      "post-2",
    ]);
    expect(posts(queryClient, rejectedKey)?.map((item) => item._id)).toEqual([
      "old",
    ]);
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unread: 2 });
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.pendingPosts.lists,
    });

    await act(async () => resolveRequest(post("post-1", "REJECTED")));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("restores every exact list snapshot on error", async () => {
    mocks.rejectAdminPendingPost.mockRejectedValue(new Error("Network error"));
    const { result, queryClient, allKey, pendingKey } = setup();

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Incomplete" }),
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(posts(queryClient, allKey)?.[0].status).toBe("PENDING");
      expect(posts(queryClient, pendingKey)?.map((item) => item._id)).toEqual([
        "post-1",
        "post-2",
      ]);
    });
  });

  it("reconciles with the server response and invalidates only active admin lists", async () => {
    mocks.rejectAdminPendingPost.mockResolvedValue({
      ...post("post-1", "REJECTED"),
      reviewNote: "Canonical server reason",
    });
    const { result, queryClient, allKey } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Draft reason" }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(posts(queryClient, allKey)?.[0].reviewNote).toBe(
      "Canonical server reason",
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.pendingPosts.lists,
      refetchType: "active",
    });
  });

  it("serializes repeated rejection requests", async () => {
    let resolveFirst!: (value: AdminPendingPost) => void;
    mocks.rejectAdminPendingPost.mockImplementation(
      ({ pendingPostId }: { pendingPostId: string }) => {
        if (pendingPostId === "post-1") {
          return new Promise<AdminPendingPost>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve(post(pendingPostId, "REJECTED"));
      },
    );
    const { result } = setup();

    act(() => {
      result.current.mutate({ pendingPostId: "post-1", reason: "Reason 1" });
      result.current.mutate({ pendingPostId: "post-2", reason: "Reason 2" });
    });

    await waitFor(() =>
      expect(mocks.rejectAdminPendingPost).toHaveBeenCalledTimes(1),
    );
    await act(async () => resolveFirst(post("post-1", "REJECTED")));
    await waitFor(() =>
      expect(mocks.rejectAdminPendingPost).toHaveBeenCalledTimes(2),
    );
  });
});
