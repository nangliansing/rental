import { describe, expect, it } from "vitest"

import { parseAdminPendingPost } from "./searchAdminPendingPosts"

describe("parseAdminPendingPost", () => {
  it("preserves a moderation record when its submitter no longer exists", () => {
    const pendingPost = parseAdminPendingPost({
      _id: "pending-post-1",
      status: "PENDING",
      submittedBy: null,
      listing: {
        rent: 14_000,
        media: [],
      },
    })

    expect(pendingPost._id).toBe("pending-post-1")
    expect(pendingPost.submittedBy).toBeNull()
    expect(pendingPost.listing.rent).toBe(14_000)
  })

  it("parses the populated submitter summary when it is available", () => {
    const pendingPost = parseAdminPendingPost({
      _id: "pending-post-2",
      status: "APPROVED",
      submittedBy: {
        _id: "user-1",
        name: "Jessie",
        email: "jessie@example.com",
        role: "USER",
        status: "ACTIVE",
      },
    })

    expect(pendingPost.submittedBy).toEqual({
      _id: "user-1",
      name: "Jessie",
      email: "jessie@example.com",
      role: "USER",
      status: "ACTIVE",
    })
  })
})
