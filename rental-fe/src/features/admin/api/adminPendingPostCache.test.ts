import { describe, expect, it } from "vitest"

import type { AdminPendingPost } from "./searchAdminPendingPosts"
import {
  createOptimisticApprovedPendingPost,
  createOptimisticRejectedPendingPost,
  findAdminPendingPost,
  getAdminPendingPostStatusFromQueryKey,
  transitionAdminPendingPostInInfiniteData,
  type AdminPendingPostsInfiniteData,
} from "./adminPendingPostCache"

const post = (
  id: string,
  status: AdminPendingPost["status"],
  extra: Partial<AdminPendingPost> = {},
) => ({ _id: id, status, reviewNote: null, ...extra }) as AdminPendingPost

function createData(
  ...posts: AdminPendingPost[]
): AdminPendingPostsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: posts,
        pagination: { page: 1, limit: 20, total: posts.length },
      },
    ],
  }
}

function createPagedData(): AdminPendingPostsInfiniteData {
  return {
    pageParams: [1, 2],
    pages: [
      {
        success: true,
        data: [post("post-1", "PENDING"), post("post-2", "PENDING")],
        pagination: { page: 1, limit: 2, total: 3 },
      },
      {
        success: true,
        data: [post("post-3", "PENDING")],
        pagination: { page: 2, limit: 2, total: 3 },
      },
    ],
  }
}

describe("getAdminPendingPostStatusFromQueryKey", () => {
  it("reads the status filter segment from the query key", () => {
    expect(
      getAdminPendingPostStatusFromQueryKey(["admin-pending-posts", "PENDING"]),
    ).toBe("PENDING")
    expect(
      getAdminPendingPostStatusFromQueryKey(["admin-pending-posts", "REJECTED"]),
    ).toBe("REJECTED")
  })

  it("returns undefined when the filter segment is missing or invalid", () => {
    expect(
      getAdminPendingPostStatusFromQueryKey(["admin-pending-posts"]),
    ).toBeUndefined()
    expect(
      getAdminPendingPostStatusFromQueryKey(["admin-pending-posts", 20]),
    ).toBeUndefined()
  })
})

describe("findAdminPendingPost", () => {
  it("finds a post across multiple cached list snapshots", () => {
    const snapshots = [
      [["admin-pending-posts", "PENDING"], createData(post("other", "PENDING"))],
      [["admin-pending-posts", "all"], createData(post("post-1", "PENDING"))],
    ] as const

    expect(findAdminPendingPost([...snapshots], "post-1")).toMatchObject({
      _id: "post-1",
    })
  })

  it("returns undefined when the post is absent from every snapshot", () => {
    expect(
      findAdminPendingPost(
        [[["admin-pending-posts", "PENDING"], createData(post("post-2", "PENDING"))]],
        "post-1",
      ),
    ).toBeUndefined()
  })

  it("skips malformed snapshots without throwing", () => {
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    } as unknown as AdminPendingPostsInfiniteData

    expect(
      findAdminPendingPost(
        [[["admin-pending-posts", "PENDING"], malformed]],
        "post-1",
      ),
    ).toBeUndefined()
  })
})

describe("createOptimisticRejectedPendingPost", () => {
  it("trims the review note and marks the post rejected", () => {
    expect(
      createOptimisticRejectedPendingPost(post("post-1", "PENDING"), "  Bad photos  "),
    ).toMatchObject({
      _id: "post-1",
      status: "REJECTED",
      reviewNote: "Bad photos",
    })
  })
})

describe("createOptimisticApprovedPendingPost", () => {
  it("trims the review note and marks the post approved", () => {
    expect(
      createOptimisticApprovedPendingPost(post("post-1", "PENDING"), "  Looks good  "),
    ).toMatchObject({
      _id: "post-1",
      status: "APPROVED",
      reviewNote: "Looks good",
    })
  })
})

describe("transitionAdminPendingPostInInfiniteData", () => {
  it("updates a rejected post in the unfiltered list", () => {
    const current = createData(post("post-1", "PENDING"), post("post-2", "PENDING"))
    const rejected = createOptimisticRejectedPendingPost(
      current.pages[0].data[0],
      "  Incomplete details  ",
    )

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      undefined,
      rejected,
    )

    expect(result?.pages[0].data[0]).toMatchObject({
      _id: "post-1",
      status: "REJECTED",
      reviewNote: "Incomplete details",
    })
    expect(result?.pages[0].pagination.total).toBe(2)
  })

  it("removes the post and adjusts totals in a nonmatching status list", () => {
    const current = createData(post("post-1", "PENDING"), post("post-2", "PENDING"))
    const rejected = post("post-1", "REJECTED")

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "PENDING",
      rejected,
    )

    expect(result?.pages[0].data.map((item) => item._id)).toEqual(["post-2"])
    expect(result?.pages[0].pagination.total).toBe(1)
    expect(result?.pageParams).toEqual([1])
  })

  it("updates an existing rejected-list item without changing its total", () => {
    const current = createData(post("post-1", "REJECTED"))
    const serverPost = {
      ...current.pages[0].data[0],
      reviewNote: "Server reason",
    }

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "REJECTED",
      serverPost,
    )

    expect(result?.pages[0].data[0]).toBe(serverPost)
    expect(result?.pages[0].pagination.total).toBe(1)
  })

  it("does not insert into a filtered paginated list with server-owned ordering", () => {
    const current = createData(post("other", "REJECTED"))

    expect(
      transitionAdminPendingPostInInfiniteData(
        current,
        "REJECTED",
        post("post-1", "REJECTED"),
      ),
    ).toBe(current)
  })

  it("updates an approved post in the unfiltered list", () => {
    const current = createData(post("post-1", "PENDING"))
    const approved = createOptimisticApprovedPendingPost(
      current.pages[0].data[0],
      "Approved",
    )

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      undefined,
      approved,
    )

    expect(result?.pages[0].data[0]).toMatchObject({
      status: "APPROVED",
      reviewNote: "Approved",
    })
  })

  it("removes an approved post from a pending-only filter", () => {
    const current = createPagedData()
    const approved = post("post-2", "APPROVED")

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "PENDING",
      approved,
    )

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-1"],
      ["post-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
  })

  it("updates a post on a later page without touching earlier rows", () => {
    const current = createPagedData()
    const keep = current.pages[0].data[0]
    const rejected = createOptimisticRejectedPendingPost(
      current.pages[1].data[0],
      "Needs work",
    )

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      undefined,
      rejected,
    )

    expect(result?.pages[0].data[0]).toBe(keep)
    expect(result?.pages[1].data[0]).toMatchObject({
      _id: "post-3",
      status: "REJECTED",
      reviewNote: "Needs work",
    })
  })

  it("preserves sibling references on in-place updates", () => {
    const current = createData(post("post-1", "PENDING"), post("post-2", "PENDING"))
    const keep = current.pages[0].data[1]
    const rejected = createOptimisticRejectedPendingPost(
      current.pages[0].data[0],
      "Reason",
    )

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      undefined,
      rejected,
    )

    expect(result?.pages[0].data[1]).toBe(keep)
  })

  it("keeps the original reference when the post is absent", () => {
    const current = createData(post("post-2", "PENDING"))

    expect(
      transitionAdminPendingPostInInfiniteData(
        current,
        "PENDING",
        post("post-1", "REJECTED"),
      ),
    ).toBe(current)
  })

  it("handles undefined input without throwing", () => {
    expect(
      transitionAdminPendingPostInInfiniteData(
        undefined,
        "PENDING",
        post("post-1", "REJECTED"),
      ),
    ).toBeUndefined()
  })

  it("leaves malformed infinite data untouched instead of throwing", () => {
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    } as unknown as AdminPendingPostsInfiniteData

    expect(
      transitionAdminPendingPostInInfiniteData(
        malformed,
        "PENDING",
        post("post-1", "REJECTED"),
      ),
    ).toBe(malformed)
  })

  it("leaves current unchanged when page item access throws", () => {
    const throwingPage = {
      get data() {
        throw new Error("data failed")
      },
      pagination: { total: 1 },
    }
    const current = {
      pageParams: [1],
      pages: [throwingPage],
    } as unknown as AdminPendingPostsInfiniteData

    expect(
      transitionAdminPendingPostInInfiniteData(
        current,
        "PENDING",
        post("post-1", "REJECTED"),
      ),
    ).toBe(current)
  })

  it("never produces a negative total when removing from a zero total", () => {
    const current = createData(post("post-1", "PENDING"))
    current.pages[0].pagination.total = 0

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "PENDING",
      post("post-1", "REJECTED"),
    )

    expect(result?.pages[0].pagination.total).toBe(0)
  })

  it("preserves unrelated page fields after removal", () => {
    const current = createData(post("post-1", "PENDING"), post("post-2", "PENDING"))

    const result = transitionAdminPendingPostInInfiniteData(
      current,
      "PENDING",
      post("post-1", "REJECTED"),
    )

    expect(result?.pages[0]).toMatchObject({
      success: true,
      pagination: { page: 1, limit: 20, total: 1 },
    })
  })
})
