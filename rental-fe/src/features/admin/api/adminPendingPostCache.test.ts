import { describe, expect, it } from "vitest";

import type { AdminPendingPost } from "./searchAdminPendingPosts";
import {
  createOptimisticRejectedPendingPost,
  transitionAdminPendingPostInInfiniteData,
  type AdminPendingPostsInfiniteData,
} from "./adminPendingPostCache";

const post = (id: string, status: AdminPendingPost["status"]) =>
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

describe("adminPendingPostCache", () => {
  it("updates a rejected post in the unfiltered list", () => {
    const current = data(post("post-1", "PENDING"), post("post-2", "PENDING"));
    const rejected = createOptimisticRejectedPendingPost(
      current.pages[0].data[0],
      "  Incomplete details  ",
    );

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      undefined,
      rejected,
    );

    expect(result?.pages[0].data[0]).toMatchObject({
      _id: "post-1",
      status: "REJECTED",
      reviewNote: "Incomplete details",
    });
    expect(result?.pages[0].pagination.total).toBe(2);
  });

  it("removes the post and adjusts totals in a nonmatching status list", () => {
    const current = data(post("post-1", "PENDING"), post("post-2", "PENDING"));
    const rejected = post("post-1", "REJECTED");

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "PENDING",
      rejected,
    );

    expect(result?.pages[0].data.map((item) => item._id)).toEqual(["post-2"]);
    expect(result?.pages[0].pagination.total).toBe(1);
    expect(result?.pageParams).toEqual([1]);
  });

  it("updates an existing rejected-list item without changing its total", () => {
    const current = data(post("post-1", "REJECTED"));
    const serverPost = {
      ...current.pages[0].data[0],
      reviewNote: "Server reason",
    };

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "REJECTED",
      serverPost,
    );

    expect(result?.pages[0].data[0]).toBe(serverPost);
    expect(result?.pages[0].pagination.total).toBe(1);
  });

  it("does not insert into a filtered paginated list with server-owned ordering", () => {
    const current = data(post("other", "REJECTED"));

    expect(
      transitionAdminPendingPostInInfiniteData(
        current,
        "REJECTED",
        post("post-1", "REJECTED"),
      ),
    ).toBe(current);
  });
});
