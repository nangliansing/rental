import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { server } from "@/test/server"

import { updateMyUser } from "./updateMyUser"

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
}

const validUser = {
  _id: "user-1",
  name: "Rental User",
  email: "user@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

describe("updateMyUser", () => {
  it("patches name only with a partial payload", async () => {
    server.use(
      http.patch("/api/v1/users/me", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({ name: "Updated Name" })
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              ...validUser,
              name: "Updated Name",
              updatedAt: "2026-07-22T00:00:00.000Z",
            },
          },
        })
      }),
    )

    await expect(updateMyUser({ name: "Updated Name" })).resolves.toMatchObject({
      name: "Updated Name",
    })
  })

  it("patches profilePhoto only with a partial payload", async () => {
    server.use(
      http.patch("/api/v1/users/me", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          profilePhoto: sampleProfilePhoto,
        })
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              ...validUser,
              profilePhoto: sampleProfilePhoto,
            },
          },
        })
      }),
    )

    await expect(
      updateMyUser({ profilePhoto: sampleProfilePhoto }),
    ).resolves.toMatchObject({
      profilePhoto: sampleProfilePhoto,
    })
  })

  it("clears profilePhoto with null", async () => {
    server.use(
      http.patch("/api/v1/users/me", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({ profilePhoto: null })
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              ...validUser,
              profilePhoto: null,
            },
          },
        })
      }),
    )

    await expect(updateMyUser({ profilePhoto: null })).resolves.toMatchObject({
      profilePhoto: null,
    })
  })

  it("patches name and profilePhoto together", async () => {
    server.use(
      http.patch("/api/v1/users/me", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          name: "Combined Update",
          profilePhoto: sampleProfilePhoto,
        })
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              ...validUser,
              name: "Combined Update",
              profilePhoto: sampleProfilePhoto,
            },
          },
        })
      }),
    )

    await expect(
      updateMyUser({
        name: "Combined Update",
        profilePhoto: sampleProfilePhoto,
      }),
    ).resolves.toMatchObject({
      name: "Combined Update",
      profilePhoto: sampleProfilePhoto,
    })
  })

  it("omits undefined fields from the request payload", async () => {
    let capturedBody: unknown
    server.use(
      http.patch("/api/v1/users/me", async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: { user: validUser },
        })
      }),
    )

    await updateMyUser({ name: "Only Name", profilePhoto: undefined })
    expect(capturedBody).toEqual({ name: "Only Name" })
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.patch("/api/v1/users/me", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(updateMyUser({ name: "Broken" })).rejects.toMatchObject({
      status: 500,
      code: "INVALID_AUTH_RESPONSE",
    })
  })

  it("surfaces validation errors from the API", async () => {
    server.use(
      http.patch("/api/v1/users/me", () =>
        HttpResponse.json(
          {
            success: false,
            code: "VALIDATION_ERROR",
            message: "No user changes provided",
          },
          { status: 422 },
        ),
      ),
    )

    await expect(updateMyUser({ name: "Same Name" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
  })

  it("surfaces rate-limit errors from the API", async () => {
    server.use(
      http.patch("/api/v1/users/me", () =>
        HttpResponse.json(
          {
            success: false,
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 },
        ),
      ),
    )

    await expect(updateMyUser({ name: "Rate Limited" })).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
    })
  })

  it("surfaces forbidden account-state errors from the API", async () => {
    server.use(
      http.patch("/api/v1/users/me", () =>
        HttpResponse.json(
          {
            success: false,
            code: "ACCOUNT_SUSPENDED",
            message: "Account is suspended",
          },
          { status: 403 },
        ),
      ),
    )

    await expect(updateMyUser({ name: "Suspended" })).rejects.toMatchObject({
      status: 403,
      code: "ACCOUNT_SUSPENDED",
    })
  })
})
