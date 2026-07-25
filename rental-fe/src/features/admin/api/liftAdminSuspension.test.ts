import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { liftAdminSuspension } from "./liftAdminSuspension"

const user = {
  _id: "user-1",
  name: "Lister",
  email: "lister@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}
const admin = {
  _id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN",
  status: "ACTIVE",
}
const suspension = {
  _id: "suspension / 1",
  userId: user._id,
  status: "LIFTED",
  reason: "Policy violation",
  note: null,
  startsAt: "2026-07-01T00:00:00.000Z",
  expiresAt: "2026-08-01T00:00:00.000Z",
  createdBy: admin,
  liftedBy: admin,
  liftedAt: "2026-07-22T00:00:00.000Z",
  liftReason: "Appeal accepted",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  user,
}

describe("liftAdminSuspension", () => {
  it("trims input, encodes the id, and parses the response", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/suspensions/:id/lift",
        async ({ params, request }) => {
          expect(params.id).toBe("suspension / 1")
          await expect(request.json()).resolves.toEqual({
            liftReason: "Appeal accepted",
          })
          return HttpResponse.json({
            success: true,
            data: { suspension, user },
          })
        },
      ),
    )

    await expect(
      liftAdminSuspension({
        suspensionId: "  suspension / 1  ",
        liftReason: "  Appeal accepted  ",
      }),
    ).resolves.toMatchObject({
      suspension: { _id: "suspension / 1", status: "LIFTED" },
      user: { _id: "user-1", status: "ACTIVE" },
    })
  })

  it("rejects empty input without sending a request", async () => {
    const request = vi.fn()
    server.use(http.patch("/api/v1/admin/suspensions/:id/lift", request))

    await expect(
      liftAdminSuspension({ suspensionId: " ", liftReason: "Reason" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      liftAdminSuspension({ suspensionId: "suspension-1", liftReason: " " }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects a malformed success response", async () => {
    server.use(
      http.patch("/api/v1/admin/suspensions/:id/lift", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      liftAdminSuspension({
        suspensionId: "suspension-1",
        liftReason: "Reason",
      }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
