import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { AuthUser } from "../types"
import {
  cacheCurrentUser,
  currentUserProjectionQueryKeys,
  patchCurrentUser,
} from "./authUserMutationCache"

const userId = "user-1"

const currentUser: AuthUser = {
  _id: userId,
  name: "Rental User",
  email: "user@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

describe("currentUserProjectionQueryKeys", () => {
  it("targets the canonical current-user cache", () => {
    expect(currentUserProjectionQueryKeys).toEqual([
      queryKeys.auth.currentUser,
    ])
  })
})

describe("cacheCurrentUser", () => {
  it("sets the current-user cache entry", () => {
    const queryClient = createQueryClient()

    cacheCurrentUser(queryClient, currentUser)

    expect(queryClient.getQueryData(queryKeys.auth.currentUser)).toEqual(
      currentUser,
    )
  })
})

describe("patchCurrentUser", () => {
  it("patches the current user cache when the id matches", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.auth.currentUser, currentUser)

    patchCurrentUser(queryClient, userId, { name: "Updated Name" })

    expect(queryClient.getQueryData<AuthUser>(queryKeys.auth.currentUser)).toEqual({
      ...currentUser,
      name: "Updated Name",
    })
  })

  it("patches profilePhoto on the current user cache", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.auth.currentUser, currentUser)

    patchCurrentUser(queryClient, userId, { profilePhoto: sampleProfilePhoto })

    expect(
      queryClient.getQueryData<AuthUser>(queryKeys.auth.currentUser)?.profilePhoto,
    ).toEqual(sampleProfilePhoto)
  })

  it("does not patch the current user cache when the id does not match", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.auth.currentUser, currentUser)

    patchCurrentUser(queryClient, "other-user", { name: "Hijacked" })

    expect(queryClient.getQueryData(queryKeys.auth.currentUser)).toEqual(
      currentUser,
    )
  })

  it("ignores undefined-only patches", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.auth.currentUser, currentUser)

    patchCurrentUser(queryClient, userId, { name: undefined })

    expect(queryClient.getQueryData(queryKeys.auth.currentUser)).toEqual(
      currentUser,
    )
  })

  it("syncs admin user projections when name changes", () => {
    const queryClient = createQueryClient()
    const adminUserKey = queryKeys.admin.users.detail(userId)
    queryClient.setQueryData(queryKeys.auth.currentUser, currentUser)
    queryClient.setQueryData(adminUserKey, currentUser)

    patchCurrentUser(queryClient, userId, { name: "Admin Visible Name" })

    expect(queryClient.getQueryData(adminUserKey)).toMatchObject({
      name: "Admin Visible Name",
    })
  })
})
