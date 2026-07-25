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

type AdminSuspensionUser = {
  _id: string
  name: string
  email: string
  role: string
  status: string
}

type AdminSuspensionMock = {
  _id: string
  userId: string
  status: "ACTIVE" | "LIFTED" | "EXPIRED"
  reason: string
  note: string | null
  startsAt: string
  expiresAt: string
  liftedAt: string | null
  liftReason: string | null
  createdAt: string
  updatedAt: string
  user: AdminSuspensionUser
  createdBy: AdminSuspensionUser
  liftedBy: AdminSuspensionUser | null
}

const adminSuspensionsListUrl = /\/api\/v1\/admin\/suspensions(?:\?|$)/
const adminSuspensionDetailUrl = /\/api\/v1\/admin\/suspensions\/[^/?]+$/
const adminSuspensionLiftUrl = /\/api\/v1\/admin\/suspensions\/[^/]+\/lift$/

export const adminSuspensionUserName = "Jessie Lister"
export const adminSuspensionUserId = "user-lister-smoke-1"
export const adminSuspensionReason = "Repeated misleading listings"

function buildSuspendedUser(): AdminSuspensionUser {
  return {
    _id: adminSuspensionUserId,
    name: adminSuspensionUserName,
    email: "jessie@example.com",
    role: "USER",
    status: "SUSPENDED",
  }
}

function buildAdminUser(): AdminSuspensionUser {
  return {
    _id: smokeAuthUser._id,
    name: smokeAuthUser.name,
    email: smokeAuthUser.email,
    role: "ADMIN",
    status: "ACTIVE",
  }
}

function buildActiveSuspension(): AdminSuspensionMock {
  const now = "2026-07-25T08:00:00.000Z"

  return {
    _id: "suspension-admin-lift-smoke-1",
    userId: adminSuspensionUserId,
    status: "ACTIVE",
    reason: adminSuspensionReason,
    note: "Multiple reports from renters.",
    startsAt: now,
    expiresAt: "2026-08-01T00:00:00.000Z",
    liftedAt: null,
    liftReason: null,
    createdAt: now,
    updatedAt: now,
    user: buildSuspendedUser(),
    createdBy: buildAdminUser(),
    liftedBy: null,
  }
}

function readJsonBody(route: Route) {
  try {
    return route.request().postDataJSON() as Record<string, unknown> | null
  } catch {
    return null
  }
}

export async function installAdminSuspensionsMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "ADMIN",
  })

  let suspensions: AdminSuspensionMock[] = [buildActiveSuspension()]

  const findSuspension = (suspensionId: string) =>
    suspensions.find((suspension) => suspension._id === suspensionId)

  const handleLiftSuspension = async (route: Route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const suspensionId = url.pathname.split("/").at(-2)
    const currentSuspension = suspensionId ? findSuspension(suspensionId) : undefined
    const body = readJsonBody(route)
    const liftReason =
      typeof body?.liftReason === "string" ? body.liftReason.trim() : ""

    if (!suspensionId || !currentSuspension || !liftReason) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "SUSPENSION_NOT_FOUND",
            message: "Suspension not found",
          },
          404,
        ),
      )
      return
    }

    const liftedAt = "2026-07-25T09:00:00.000Z"
    const updatedSuspension: AdminSuspensionMock = {
      ...currentSuspension,
      status: "LIFTED",
      liftedAt,
      liftReason,
      liftedBy: buildAdminUser(),
      updatedAt: liftedAt,
      user: {
        ...currentSuspension.user,
        status: "ACTIVE",
      },
    }

    suspensions = suspensions.map((suspension) =>
      suspension._id === suspensionId ? updatedSuspension : suspension,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          suspension: updatedSuspension,
          user: {
            _id: updatedSuspension.user._id,
            name: updatedSuspension.user.name,
            email: updatedSuspension.user.email,
            authProvider: "GOOGLE",
            role: updatedSuspension.user.role,
            status: updatedSuspension.user.status,
            createdAt: "2026-07-20T00:00:00.000Z",
            updatedAt: liftedAt,
          },
        },
      }),
    )
  }

  const handleSuspensionDetail = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const suspensionId = url.pathname.split("/").pop()
    const currentSuspension = suspensionId ? findSuspension(suspensionId) : undefined

    if (!currentSuspension) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "SUSPENSION_NOT_FOUND",
            message: "Suspension not found",
          },
          404,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: currentSuspension,
      }),
    )
  }

  const handleSuspensionsList = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const status = url.searchParams.get("status")
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")
    const filteredSuspensions =
      status && status !== "all"
        ? suspensions.filter((suspension) => suspension.status === status)
        : suspensions

    await route.fulfill(
      jsonRoute({
        success: true,
        data: filteredSuspensions,
        pagination: {
          page: pageNumber,
          limit,
          total: filteredSuspensions.length,
        },
      }),
    )
  }

  await page.route(adminSuspensionLiftUrl, handleLiftSuspension)
  await page.route(adminSuspensionDetailUrl, handleSuspensionDetail)
  await page.route(adminSuspensionsListUrl, handleSuspensionsList)
}
