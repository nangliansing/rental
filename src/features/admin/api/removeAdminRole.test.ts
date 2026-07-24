import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { removeAdminRole } from "./removeAdminRole"

const user = {
  _id: "admin / 1",
  name: "Former Admin",
  email: "admin@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

describe("removeAdminRole", () => {
  it("trims and encodes the user id and parses the updated user", async () => {
    server.use(
      http.patch("/api/v1/admin/users/:id/remove-admin", ({ params }) => {
        expect(params.id).toBe("admin / 1")
        return HttpResponse.json({ success: true, data: user })
      }),
    )

    await expect(
      removeAdminRole({ userId: "  admin / 1  " }),
    ).resolves.toEqual(user)
  })

  it("rejects an empty user id without sending a request", async () => {
    const request = vi.fn()
    server.use(http.patch("/api/v1/admin/users/:id/remove-admin", request))

    await expect(removeAdminRole({ userId: " " })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed or non-user success responses", async () => {
    server.use(
      http.patch("/api/v1/admin/users/:id/remove-admin", () =>
        HttpResponse.json({
          success: true,
          data: { ...user, role: "ADMIN" },
        }),
      ),
    )

    await expect(
      removeAdminRole({ userId: "admin-1" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
