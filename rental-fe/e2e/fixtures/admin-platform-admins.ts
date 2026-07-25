import type { Page, Route } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAuthUser,
} from "./authenticated-session"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

type PlatformAdminMock = {
  _id: string
  name: string
  email: string
  authProvider: string
  role: "OWNER" | "ADMIN"
  status: string
  createdAt: string
  updatedAt: string
}

const platformAdminsListUrl =
  /\/api\/v1\/admin\/users\/platform-admins(?:\?|$)/
const adminUserDetailUrl =
  /\/api\/v1\/admin\/users\/(?!platform-admins)[^/?]+$/
const removeAdminRoleUrl =
  /\/api\/v1\/admin\/users\/[^/]+\/remove-admin$/

export const adminPlatformAdminName = "Alex Admin"
export const adminPlatformAdminId = "user-admin-smoke-1"
export const adminPlatformAdminEmail = "alex.admin@example.com"
export const adminPlatformOwnerName = smokeAuthUser.name

function buildOwnerAccount(): PlatformAdminMock {
  return {
    _id: smokeAuthUser._id,
    name: smokeAuthUser.name,
    email: smokeAuthUser.email,
    authProvider: smokeAuthUser.authProvider,
    role: "OWNER",
    status: "ACTIVE",
    createdAt: smokeAuthUser.createdAt,
    updatedAt: smokeAuthUser.updatedAt,
  }
}

function buildAdminAccount(): PlatformAdminMock {
  return {
    _id: adminPlatformAdminId,
    name: adminPlatformAdminName,
    email: adminPlatformAdminEmail,
    authProvider: "GOOGLE",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
  }
}

function toUserDetails(admin: PlatformAdminMock) {
  return {
    ...admin,
    agentProfile: null,
  }
}

export async function installAdminPlatformAdminsMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "OWNER",
  })

  let platformAdmins: PlatformAdminMock[] = [
    buildAdminAccount(),
    buildOwnerAccount(),
  ]

  const findPlatformAdmin = (userId: string) =>
    platformAdmins.find((admin) => admin._id === userId)

  const handleRemoveAdminRole = async (route: Route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const userId = url.pathname.split("/").at(-2)
    const currentAdmin = userId ? findPlatformAdmin(userId) : undefined

    if (!userId || !currentAdmin || currentAdmin.role !== "ADMIN") {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
          404,
        ),
      )
      return
    }

    const updatedAt = "2026-07-25T09:00:00.000Z"
    const updatedUser = {
      ...currentAdmin,
      role: "USER" as const,
      updatedAt,
    }

    platformAdmins = platformAdmins.filter((admin) => admin._id !== userId)

    await route.fulfill(
      jsonRoute({
        success: true,
        data: updatedUser,
      }),
    )
  }

  const handleAdminUserDetail = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const userId = url.pathname.split("/").pop()
    const currentAdmin = userId ? findPlatformAdmin(userId) : undefined

    if (!currentAdmin) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
          404,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: toUserDetails(currentAdmin),
      }),
    )
  }

  const handlePlatformAdminsList = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")

    await route.fulfill(
      jsonRoute({
        success: true,
        data: platformAdmins,
        pagination: {
          page: pageNumber,
          limit,
          total: platformAdmins.length,
        },
      }),
    )
  }

  await page.route(removeAdminRoleUrl, handleRemoveAdminRole)
  await page.route(adminUserDetailUrl, handleAdminUserDetail)
  await page.route(platformAdminsListUrl, handlePlatformAdminsList)
}
