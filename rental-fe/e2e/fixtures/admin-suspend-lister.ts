import type { Page, Route } from "@playwright/test"

import { smokeAuthUser } from "./authenticated-session"
import {
  adminModerationBuildingName,
  installAdminModerationMocks,
} from "./admin-moderation"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

const adminSuspensionsCreateUrl = /\/api\/v1\/admin\/suspensions(?:\?|$)/

export const adminSuspendListerName = "Jessie Lister"
export const adminSuspendListerUserId = "user-lister-smoke-1"

function readJsonBody(route: Route) {
  try {
    return route.request().postDataJSON() as Record<string, unknown> | null
  } catch {
    return null
  }
}

function buildCreateSuspensionResponse(
  body: Record<string, unknown>,
) {
  const now = "2026-07-25T09:00:00.000Z"
  const userId =
    typeof body.userId === "string" ? body.userId : adminSuspendListerUserId
  const reason =
    typeof body.reason === "string" ? body.reason : "Fake or suspicious lister"
  const note = typeof body.note === "string" ? body.note : null
  const expiresAt =
    typeof body.expiresAt === "string"
      ? body.expiresAt
      : "2026-08-01T00:00:00.000Z"

  return {
    success: true,
    data: {
      suspension: {
        _id: "suspension-admin-smoke-1",
        userId,
        status: "ACTIVE",
        reason,
        note,
        startsAt: now,
        expiresAt,
        createdBy: smokeAuthUser._id,
        liftedBy: null,
        liftedAt: null,
        liftReason: null,
        createdAt: now,
        updatedAt: now,
      },
      user: {
        _id: userId,
        name: adminSuspendListerName,
        email: "jessie@example.com",
        authProvider: "GOOGLE",
        role: "USER",
        status: "SUSPENDED",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: now,
      },
    },
  }
}

export async function installAdminSuspendListerMocks(page: Page) {
  await installAdminModerationMocks(page)

  await page.route(adminSuspensionsCreateUrl, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue()
      return
    }

    const body = readJsonBody(route) ?? {}

    await route.fulfill(jsonRoute(buildCreateSuspensionResponse(body)))
  })
}

export { adminModerationBuildingName }
