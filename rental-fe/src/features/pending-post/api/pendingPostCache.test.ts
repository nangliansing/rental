import { describe, expect, it } from "vitest"

import type { PendingPost } from "./createPendingPost"
import {
  removePendingPostFromInfiniteData,
  type OwnerPendingPostsInfiniteData,
} from "./pendingPostCache"

const post = (id: string) => ({ _id: id }) as PendingPost

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
})
