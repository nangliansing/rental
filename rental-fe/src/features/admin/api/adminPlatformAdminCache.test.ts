import { describe, expect, it } from "vitest"

import {
  removePlatformAdminFromInfiniteData,
  type AdminPlatformAdminsInfiniteData,
} from "./adminPlatformAdminCache"

const admin = (id: string) => ({
  _id: id,
  name: `Admin ${id}`,
  email: `${id}@example.com`,
  authProvider: "GOOGLE",
  role: "ADMIN",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
})

function createData(...admins: ReturnType<typeof admin>[]) {
  return {
    pageParams: [1],
    pages: [
      {
        success: true as const,
        data: admins,
        pagination: { page: 1, limit: 20, total: admins.length },
      },
    ],
  } satisfies AdminPlatformAdminsInfiniteData
}

describe("removePlatformAdminFromInfiniteData", () => {
  it("removes the admin and adjusts totals", () => {
    const current = createData(admin("admin-1"), admin("admin-2"))

    const result = removePlatformAdminFromInfiniteData(current, "admin-1")

    expect(result?.pages[0].data.map((item) => item._id)).toEqual(["admin-2"])
    expect(result?.pages[0].pagination.total).toBe(1)
  })

  it("removes the admin across multi-page data", () => {
    const current: AdminPlatformAdminsInfiniteData = {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: [admin("admin-1"), admin("admin-2")],
          pagination: { page: 1, limit: 2, total: 3 },
        },
        {
          success: true,
          data: [admin("admin-3")],
          pagination: { page: 2, limit: 2, total: 3 },
        },
      ],
    }

    const result = removePlatformAdminFromInfiniteData(current, "admin-2")

    expect(result?.pages.map((page) => page.data.map((item) => item._id))).toEqual([
      ["admin-1"],
      ["admin-3"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
  })

  it("preserves sibling references", () => {
    const current = createData(admin("admin-1"), admin("admin-2"))
    const keep = current.pages[0].data[1]

    const result = removePlatformAdminFromInfiniteData(current, "admin-1")

    expect(result?.pages[0].data[0]).toBe(keep)
  })

  it("returns undefined input unchanged", () => {
    expect(
      removePlatformAdminFromInfiniteData(undefined, "admin-1"),
    ).toBeUndefined()
  })

  it("keeps the original reference when the admin is absent", () => {
    const current = createData(admin("admin-2"))

    expect(
      removePlatformAdminFromInfiniteData(current, "admin-1"),
    ).toBe(current)
  })

  it("leaves malformed infinite data untouched instead of throwing", () => {
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    } as unknown as AdminPlatformAdminsInfiniteData

    expect(
      removePlatformAdminFromInfiniteData(malformed, "admin-1"),
    ).toBe(malformed)
  })

  it("never produces a negative total when removing from a zero total", () => {
    const current = createData(admin("admin-1"))
    current.pages[0].pagination.total = 0

    const result = removePlatformAdminFromInfiniteData(current, "admin-1")

    expect(result?.pages[0].pagination.total).toBe(0)
  })
})
