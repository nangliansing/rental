import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PendingPost } from "@/features/pending-post";
import type { OwnerPendingPostsInfiniteData } from "@/features/pending-post/api/pendingPostCache";
import { queryKeys } from "@/lib/query-keys";

import type { AdminPendingPostsInfiniteData } from "./adminPendingPostCache";
import type { AdminPendingPost } from "./searchAdminPendingPosts";

const mocks = vi.hoisted(() => ({ approveAdminPendingPost: vi.fn() }));

vi.mock("./approveAdminPendingPost", () => ({
  approveAdminPendingPost: mocks.approveAdminPendingPost,
}));

import { useApproveAdminPendingPost } from "./useApproveAdminPendingPost";

const adminPost = (
  id: string,
  overrides: Partial<AdminPendingPost> = {},
) =>
  ({
    _id: id,
    status: "PENDING",
    reviewNote: null,
    submittedBy: { _id: "owner-1" },
    agentProfile: { _id: "profile-1" },
    ...overrides,
  }) as AdminPendingPost;

const adminData = (...posts: AdminPendingPost[]): AdminPendingPostsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: posts,
      pagination: { page: 1, limit: 20, total: posts.length },
    },
  ],
});

const ownerData = (...posts: PendingPost[]): OwnerPendingPostsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: posts,
      pagination: { page: 1, limit: 20, total: posts.length },
    },
  ],
});

function setup(currentUserId = "owner-1") {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const allKey = queryKeys.admin.pendingPosts.list(undefined);
  const pendingKey = queryKeys.admin.pendingPosts.list("PENDING");
  const approvedKey = queryKeys.admin.pendingPosts.list("APPROVED");
  const ownerAllKey = queryKeys.pendingPosts.ownerList({
    status: "all",
    limit: 20,
  });
  const ownerPendingKey = queryKeys.pendingPosts.ownerList({
    status: "PENDING",
    limit: 20,
  });
  const sourcePost = adminPost("post-1");
  queryClient.setQueryData(allKey, adminData(sourcePost));
  queryClient.setQueryData(pendingKey, adminData(sourcePost));
  queryClient.setQueryData(approvedKey, adminData());
  queryClient.setQueryData(
    ownerAllKey,
    ownerData({ _id: "post-1", status: "PENDING" } as PendingPost),
  );
  queryClient.setQueryData(
    ownerPendingKey,
    ownerData({ _id: "post-1", status: "PENDING" } as PendingPost),
  );
  const summary = {
    listingSummary: {
      activeCount: 2,
      pendingCount: 1,
      approvedCount: 2,
      rejectedCount: 0,
    },
  };
  queryClient.setQueryData(queryKeys.profiles.detail("profile-1"), summary);
  queryClient.setQueryData(queryKeys.profiles.me, summary);

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...renderHook(() => useApproveAdminPendingPost(currentUserId), {
      wrapper: Wrapper,
    }),
    allKey,
    approvedKey,
    ownerAllKey,
    ownerPendingKey,
    pendingKey,
    queryClient,
  };
}

const adminPosts = (client: QueryClient, key: readonly unknown[]) =>
  client
    .getQueryData<AdminPendingPostsInfiniteData>(key)
    ?.pages.flatMap((page) => page.data);

describe("useApproveAdminPendingPost", () => {
  beforeEach(() => {
    mocks.approveAdminPendingPost.mockReset();
  });

  it("optimistically updates admin and proven owner/profile caches", async () => {
    let resolve!: (post: AdminPendingPost) => void;
    mocks.approveAdminPendingPost.mockReturnValue(
      new Promise<AdminPendingPost>((done) => {
        resolve = done;
      }),
    );
    const { result, queryClient, allKey, pendingKey, ownerAllKey, ownerPendingKey } =
      setup();

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Verified" }),
    );

    await waitFor(() =>
      expect(adminPosts(queryClient, allKey)?.[0]).toMatchObject({
        status: "APPROVED",
        reviewNote: "Verified",
      }),
    );
    expect(adminPosts(queryClient, pendingKey)).toEqual([]);
    expect(
      queryClient
        .getQueryData<OwnerPendingPostsInfiniteData>(ownerAllKey)
        ?.pages[0].data[0].status,
    ).toBe("APPROVED");
    expect(
      queryClient.getQueryData<OwnerPendingPostsInfiniteData>(ownerPendingKey)
        ?.pages[0].data,
    ).toEqual([]);
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toMatchObject({
      listingSummary: { activeCount: 3, pendingCount: 0, approvedCount: 3 },
    });

    await act(async () => resolve(adminPost("post-1", { status: "APPROVED" })));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not touch current-owner caches when the submitter differs", async () => {
    mocks.approveAdminPendingPost.mockResolvedValue(
      adminPost("post-1", { status: "APPROVED" }),
    );
    const { result, queryClient, ownerAllKey } = setup("different-admin");

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Verified" }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      queryClient
        .getQueryData<OwnerPendingPostsInfiniteData>(ownerAllKey)
        ?.pages[0].data[0].status,
    ).toBe("PENDING");
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toMatchObject({
      listingSummary: { activeCount: 2, pendingCount: 1 },
    });
  });

  it("restores every optimistic cache on failure", async () => {
    mocks.approveAdminPendingPost.mockRejectedValue(new Error("Network error"));
    const { result, queryClient, allKey, pendingKey, ownerAllKey } = setup();

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Verified" }),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(adminPosts(queryClient, allKey)?.[0].status).toBe("PENDING");
    expect(adminPosts(queryClient, pendingKey)).toHaveLength(1);
    expect(
      queryClient
        .getQueryData<OwnerPendingPostsInfiniteData>(ownerAllKey)
        ?.pages[0].data[0].status,
    ).toBe("PENDING");
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toMatchObject({
      listingSummary: { activeCount: 2, pendingCount: 1 },
    });
  });

  it("invalidates identified server-owned query families after success", async () => {
    mocks.approveAdminPendingPost.mockResolvedValue(
      adminPost("post-1", {
        status: "APPROVED",
        approvedBuildingId: "building-1",
        approvedListingId: "listing-1",
      }),
    );
    const { result, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    act(() =>
      result.current.mutate({ pendingPostId: "post-1", reason: "Verified" }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidate.mock.calls.map(
      ([options]) => options?.queryKey,
    );
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        queryKeys.admin.pendingPosts.lists,
        queryKeys.agentListings.lists,
        queryKeys.mapSearch.buildings,
        queryKeys.mapSearch.listingsInBuilding,
        queryKeys.profiles.detail("profile-1"),
        queryKeys.buildings.detail("building-1"),
        queryKeys.listings.publicListingDetails("listing-1"),
        queryKeys.pendingPosts.ownerLists,
        queryKeys.listings.ownerLists,
        queryKeys.profiles.me,
      ]),
    );
  });

  it("serializes repeated approvals", async () => {
    let resolveFirst!: (post: AdminPendingPost) => void;
    mocks.approveAdminPendingPost.mockImplementation(
      ({ pendingPostId }: { pendingPostId: string }) =>
        pendingPostId === "post-1"
          ? new Promise<AdminPendingPost>((resolve) => {
              resolveFirst = resolve;
            })
          : Promise.resolve(adminPost(pendingPostId, { status: "APPROVED" })),
    );
    const { result } = setup();

    act(() => {
      result.current.mutate({ pendingPostId: "post-1", reason: "One" });
      result.current.mutate({ pendingPostId: "post-2", reason: "Two" });
    });
    await waitFor(() =>
      expect(mocks.approveAdminPendingPost).toHaveBeenCalledTimes(1),
    );
    await act(async () =>
      resolveFirst(adminPost("post-1", { status: "APPROVED" })),
    );
    await waitFor(() =>
      expect(mocks.approveAdminPendingPost).toHaveBeenCalledTimes(2),
    );
  });
});
