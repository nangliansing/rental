import { describe, expect, it } from "vitest"

import type { PendingPost, PendingPostStatus } from "./createPendingPost"
import {
  getOwnerPendingPostStatusFromQueryKey,
  insertPendingPostIntoInfiniteData,
  removePendingPostFromInfiniteData,
  transitionOwnerPendingPostInInfiniteData,
  type OwnerPendingPostsInfiniteData,
} from "./pendingPostCache"

const post = (
  id: string,
  status: PendingPostStatus = "PENDING",
  extra: Partial<PendingPost> = {},
) => ({ _id: id, status, ...extra }) as PendingPost

function createData(): OwnerPendingPostsInfiniteData {
  return {
    pageParams: [1, 2],
    pages: [
      {
        success: true,
        data: [post("post-1"), post("post-2")],
        pagination: { page: 1, limit: 2, total: 3 },
      },
      {
        success: true,
        data: [post("post-3")],
        pagination: { page: 2, limit: 2, total: 3 },
      },
    ],
  }
}

describe("getOwnerPendingPostStatusFromQueryKey", () => {
  it("reads the status filter segment from the query key", () => {
    expect(getOwnerPendingPostStatusFromQueryKey(["owner-pending-posts", "PENDING"])).toBe(
      "PENDING",
    )
    expect(getOwnerPendingPostStatusFromQueryKey(["owner-pending-posts", "all"])).toBe(
      "all",
    )
  })

  it("returns undefined when the filter segment is missing", () => {
    expect(getOwnerPendingPostStatusFromQueryKey(["owner-pending-posts"])).toBeUndefined()
    expect(getOwnerPendingPostStatusFromQueryKey(["owner-pending-posts", 20])).toBeUndefined()
  })
})

describe("removePendingPostFromInfiniteData", () => {
  it("removes a post across pages and updates the shared total", () => {
    const result = removePendingPostFromInfiniteData(createData(), "post-2")

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-1"],
      ["post-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
    expect(result?.pageParams).toEqual([1, 2])
  })

  it("keeps the original reference when the post is absent", () => {
    const data = createData()
    expect(removePendingPostFromInfiniteData(data, "missing")).toBe(data)
  })

  it("never produces a negative total", () => {
    const data = createData()
    data.pages.forEach((page) => {
      page.pagination.total = 0
    })

    const result = removePendingPostFromInfiniteData(data, "post-1")
    expect(result?.pages.every((page) => page.pagination.total === 0)).toBe(true)
  })

  it("leaves malformed infinite data untouched instead of throwing", () => {
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    } as unknown as OwnerPendingPostsInfiniteData

    expect(
      removePendingPostFromInfiniteData(malformed, "post-1"),
    ).toBe(malformed)
  })

  it("preserves unrelated page fields after removal", () => {
    const data = createData()
    const result = removePendingPostFromInfiniteData(data, "post-2")

    expect(result?.pages[0]).toMatchObject({
      success: true,
      pagination: { page: 1, limit: 2, total: 2 },
    })
  })

  it("handles undefined input without throwing", () => {
    expect(removePendingPostFromInfiniteData(undefined, "post-1")).toBeUndefined()
  })

  it("removes a post from the first page only and keeps later pages intact", () => {
    const result = removePendingPostFromInfiniteData(createData(), "post-1")

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-2"],
      ["post-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
  })

  it("removes a post from a later page without touching earlier rows", () => {
    const result = removePendingPostFromInfiniteData(createData(), "post-3")

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-1", "post-2"],
      [],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
  })

  it("removes duplicate rows when the same id appears twice", () => {
    const data: OwnerPendingPostsInfiniteData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: [post("post-1"), post("post-1"), post("post-2")],
          pagination: { page: 1, limit: 3, total: 3 },
        },
      ],
    }

    const result = removePendingPostFromInfiniteData(data, "post-1")

    expect(result?.pages[0].data.map((item) => item._id)).toEqual(["post-2"])
    expect(result?.pages[0].pagination.total).toBe(1)
  })

  it("preserves sibling references on copy-on-write removal", () => {
    const keep = post("post-1")
    const data: OwnerPendingPostsInfiniteData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: [keep, post("post-2")],
          pagination: { page: 1, limit: 2, total: 2 },
        },
      ],
    }

    const result = removePendingPostFromInfiniteData(data, "post-2")

    expect(result?.pages[0].data[0]).toBe(keep)
  })

  it("leaves non-infinite cache shapes untouched", () => {
    const flat = {
      data: [post("post-1")],
      pagination: { total: 1 },
    } as unknown as OwnerPendingPostsInfiniteData

    expect(removePendingPostFromInfiniteData(flat, "post-1")).toBe(flat)
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
    } as unknown as OwnerPendingPostsInfiniteData

    expect(removePendingPostFromInfiniteData(current, "post-1")).toBe(current)
  })
})

describe("insertPendingPostIntoInfiniteData", () => {
  it("shifts full pages without exceeding their limits", () => {
    const result = insertPendingPostIntoInfiniteData(
      createData(),
      "all",
      post("post-0"),
    )

    expect(
      result?.pages.map((page) => page.data.map((item) => item._id)),
    ).toEqual([
      ["post-0", "post-1"],
      ["post-2", "post-3"],
    ])
    expect(
      result?.pages.map((page) => page.pagination.total),
    ).toEqual([4, 4])
  })

  it("does not insert duplicates or increment totals twice", () => {
    const data = createData()
    expect(
      insertPendingPostIntoInfiniteData(data, "all", post("post-2")),
    ).toBe(data)
  })

  it("normalizes unusable pagination values without throwing", () => {
    const malformed = createData()
    malformed.pages[0].pagination.limit = Number.NaN
    malformed.pages[0].pagination.total = Number.NaN

    const result = insertPendingPostIntoInfiniteData(
      malformed,
      "all",
      post("post-0"),
    )

    expect(result?.pages[0].data.map((item) => item._id)).toEqual([
      "post-0",
      "post-1",
      "post-2",
    ])
    expect(result?.pages[0].pagination.total).toBe(4)
  })

  it("skips filtered lists that do not include the new post status", () => {
    const data = createData()

    expect(
      insertPendingPostIntoInfiniteData(data, "REJECTED", post("post-0", "PENDING")),
    ).toBe(data)
  })

  it("inserts into a status-filtered list when the post matches", () => {
    const result = insertPendingPostIntoInfiniteData(
      createData(),
      "PENDING",
      post("post-0", "PENDING"),
    )

    expect(result?.pages[0].data[0]?._id).toBe("post-0")
  })

  it("returns the original reference for undefined input", () => {
    expect(
      insertPendingPostIntoInfiniteData(undefined, "all", post("post-0")),
    ).toBeUndefined()
  })

  it("returns the original reference for empty pages", () => {
    const data = { pages: [], pageParams: [] } as unknown as OwnerPendingPostsInfiniteData

    expect(
      insertPendingPostIntoInfiniteData(data, "all", post("post-0")),
    ).toBe(data)
  })

  it("leaves malformed infinite data untouched instead of throwing", () => {
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    } as unknown as OwnerPendingPostsInfiniteData

    expect(
      insertPendingPostIntoInfiniteData(malformed, "all", post("post-0")),
    ).toBe(malformed)
  })

  it("preserves unrelated page fields after insertion", () => {
    const result = insertPendingPostIntoInfiniteData(
      createData(),
      "all",
      post("post-0"),
    )

    expect(result?.pages[0]).toMatchObject({
      success: true,
      pagination: { page: 1, limit: 2, total: 4 },
    })
    expect(result?.pageParams).toEqual([1, 2])
  })

  it("redistributes items across three loaded pages", () => {
    const data: OwnerPendingPostsInfiniteData = {
      pageParams: [1, 2, 3],
      pages: [
        {
          success: true,
          data: [post("post-1"), post("post-2")],
          pagination: { page: 1, limit: 2, total: 5 },
        },
        {
          success: true,
          data: [post("post-3"), post("post-4")],
          pagination: { page: 2, limit: 2, total: 5 },
        },
        {
          success: true,
          data: [post("post-5")],
          pagination: { page: 3, limit: 2, total: 5 },
        },
      ],
    }

    const result = insertPendingPostIntoInfiniteData(data, "all", post("post-0"))

    expect(
      result?.pages.map((page) => page.data.map((item) => item._id)),
    ).toEqual([
      ["post-0", "post-1"],
      ["post-2", "post-3"],
      ["post-4", "post-5"],
    ])
    expect(result?.pages.every((page) => page.pagination.total === 6)).toBe(true)
  })

  it("uses per-page limits when later pages define a different page size", () => {
    const data: OwnerPendingPostsInfiniteData = {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: [post("post-1")],
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          success: true,
          data: [post("post-2")],
          pagination: { page: 2, limit: 3, total: 2 },
        },
      ],
    }

    const result = insertPendingPostIntoInfiniteData(data, "all", post("post-0"))

    expect(
      result?.pages.map((page) => page.data.map((item) => item._id)),
    ).toEqual([["post-0"], ["post-1", "post-2"]])
  })

  it("skips insertion when the status filter is undefined", () => {
    const data = createData()

    expect(
      insertPendingPostIntoInfiniteData(data, undefined, post("post-0", "PENDING")),
    ).toBe(data)
  })

  it("inserts approved posts into the all-status list", () => {
    const result = insertPendingPostIntoInfiniteData(
      createData(),
      "all",
      post("post-0", "APPROVED"),
    )

    expect(result?.pages[0].data[0]).toMatchObject({
      _id: "post-0",
      status: "APPROVED",
    })
  })

  it("leaves non-infinite cache shapes untouched", () => {
    const flat = {
      data: [post("post-1")],
      pagination: { total: 1 },
    } as unknown as OwnerPendingPostsInfiniteData

    expect(
      insertPendingPostIntoInfiniteData(flat, "all", post("post-0")),
    ).toBe(flat)
  })

  it("ignores non-record entries while shifting pages", () => {
    const data = createData()
    data.pages[0].data = [
      null as never,
      post("post-1"),
      "bad" as never,
      post("post-2"),
    ]

    const result = insertPendingPostIntoInfiniteData(data, "all", post("post-0"))

    expect(result?.pages[0].data.map((item) => item?._id)).toEqual([
      "post-0",
      "post-1",
    ])
  })

  it("leaves current unchanged when page item access throws during insert", () => {
    const throwingPage = {
      get data() {
        throw new Error("data failed")
      },
      pagination: { total: 1, limit: 1 },
    }
    const current = {
      pageParams: [1],
      pages: [throwingPage],
    } as unknown as OwnerPendingPostsInfiniteData

    expect(
      insertPendingPostIntoInfiniteData(current, "all", post("post-0")),
    ).toBe(current)
  })

  it("never mutates frozen page rows", () => {
    const row1 = Object.freeze(post("post-1"))
    const row2 = Object.freeze(post("post-2"))
    const data = Object.freeze({
      pageParams: [1],
      pages: Object.freeze([
        Object.freeze({
          success: true,
          data: Object.freeze([row1, row2]),
          pagination: Object.freeze({ page: 1, limit: 3, total: 2 }),
        }),
      ]),
    }) as unknown as OwnerPendingPostsInfiniteData

    const result = insertPendingPostIntoInfiniteData(data, "all", post("post-0"))

    expect(result?.pages[0].data[1]).toBe(row1)
    expect(result?.pages[0].data[2]).toBe(row2)
  })
})

describe("transitionOwnerPendingPostInInfiniteData", () => {
  it("updates the post in place when it still belongs in the filtered list", () => {
    const result = transitionOwnerPendingPostInInfiniteData(
      createData(),
      "all",
      "post-2",
      "REJECTED",
      { reviewNote: "Needs changes" },
    )

    expect(result?.pages[0].data[1]).toMatchObject({
      _id: "post-2",
      status: "REJECTED",
      reviewNote: "Needs changes",
    })
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([3, 3])
  })

  it("removes the post when the new status falls outside the active filter", () => {
    const result = transitionOwnerPendingPostInInfiniteData(
      createData(),
      "PENDING",
      "post-2",
      "REJECTED",
    )

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-1"],
      ["post-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
  })

  it("keeps the original reference when the post is absent", () => {
    const data = createData()
    expect(
      transitionOwnerPendingPostInInfiniteData(
        data,
        "all",
        "missing",
        "APPROVED",
      ),
    ).toBe(data)
  })

  it("returns the original reference when the cache is malformed", () => {
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    } as unknown as OwnerPendingPostsInfiniteData

    expect(
      transitionOwnerPendingPostInInfiniteData(
        malformed,
        "all",
        "post-1",
        "APPROVED",
      ),
    ).toBe(malformed)
  })

  it("updates only the targeted post and preserves siblings", () => {
    const data = createData()
    const keep = data.pages[0].data[0]

    const result = transitionOwnerPendingPostInInfiniteData(
      data,
      "all",
      "post-2",
      "PENDING",
      { reviewNote: "Still pending" },
    )

    expect(result?.pages[0].data[0]).toBe(keep)
    expect(result?.pages[0].data[1]).toMatchObject({
      _id: "post-2",
      reviewNote: "Still pending",
    })
  })

  it("keeps an approved post in the all-status list", () => {
    const result = transitionOwnerPendingPostInInfiniteData(
      createData(),
      "all",
      "post-2",
      "APPROVED",
      { reviewNote: "Looks good" },
    )

    expect(result?.pages.flatMap((page) => page.data.map((item) => item._id))).toContain(
      "post-2",
    )
    expect(result?.pages[0].data[1]).toMatchObject({
      status: "APPROVED",
      reviewNote: "Looks good",
    })
  })

  it("keeps a rejected post in a rejected filter", () => {
    const data: OwnerPendingPostsInfiniteData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: [post("post-1", "PENDING"), post("post-2", "PENDING")],
          pagination: { page: 1, limit: 2, total: 2 },
        },
      ],
    }

    const result = transitionOwnerPendingPostInInfiniteData(
      data,
      "REJECTED",
      "post-2",
      "REJECTED",
    )

    expect(result?.pages[0].data.map((item) => item._id)).toEqual([
      "post-1",
      "post-2",
    ])
    expect(result?.pages[0].data[1]?.status).toBe("REJECTED")
  })

  it("removes a post from a rejected filter when it transitions back to pending", () => {
    const data: OwnerPendingPostsInfiniteData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: [post("post-1", "REJECTED"), post("post-2", "REJECTED")],
          pagination: { page: 1, limit: 2, total: 2 },
        },
      ],
    }

    const result = transitionOwnerPendingPostInInfiniteData(
      data,
      "REJECTED",
      "post-2",
      "PENDING",
    )

    expect(result?.pages[0].data.map((item) => item._id)).toEqual(["post-1"])
    expect(result?.pages[0].pagination.total).toBe(1)
  })

  it("updates a post on a later page without touching earlier rows", () => {
    const data = createData()
    const keep = data.pages[0].data[0]

    const result = transitionOwnerPendingPostInInfiniteData(
      data,
      "all",
      "post-3",
      "REJECTED",
      { reviewNote: "Late page update" },
    )

    expect(result?.pages[0].data[0]).toBe(keep)
    expect(result?.pages[1].data[0]).toMatchObject({
      _id: "post-3",
      status: "REJECTED",
      reviewNote: "Late page update",
    })
  })

  it("handles undefined input without throwing", () => {
    expect(
      transitionOwnerPendingPostInInfiniteData(
        undefined,
        "all",
        "post-1",
        "APPROVED",
      ),
    ).toBeUndefined()
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
    } as unknown as OwnerPendingPostsInfiniteData

    expect(
      transitionOwnerPendingPostInInfiniteData(
        current,
        "all",
        "post-1",
        "APPROVED",
      ),
    ).toBe(current)
  })
})

describe("pending post cache flows", () => {
  it("insert then remove compacts totals without reshifting page boundaries", () => {
    const inserted = insertPendingPostIntoInfiniteData(
      createData(),
      "all",
      post("post-0"),
    )
    expect(
      inserted?.pages.map((page) => page.data.map((item) => item._id)),
    ).toEqual([
      ["post-0", "post-1"],
      ["post-2", "post-3"],
    ])

    const result = removePendingPostFromInfiniteData(inserted, "post-0")

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-1"],
      ["post-2", "post-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([3, 3])
  })

  it("insert then transition-off-filter removes the new post without reflowing pages", () => {
    const inserted = insertPendingPostIntoInfiniteData(
      createData(),
      "PENDING",
      post("post-0", "PENDING"),
    )

    const result = transitionOwnerPendingPostInInfiniteData(
      inserted,
      "PENDING",
      "post-0",
      "REJECTED",
    )

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["post-1"],
      ["post-2", "post-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([3, 3])
  })
})
