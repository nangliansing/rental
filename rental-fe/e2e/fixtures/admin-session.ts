import type { Page } from "@playwright/test"

import { installAuthenticatedSessionMocks } from "./authenticated-session"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

export type AdminPanelMockOptions = {
  role?: "USER" | "ADMIN" | "OWNER"
}

export async function installAdminPanelMocks(
  page: Page,
  options: AdminPanelMockOptions = {},
) {
  const role = options.role ?? "ADMIN"

  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role,
  })

  await page.route("**/api/v1/admin/pending-posts**", async (route) => {
    const url = new URL(route.request().url())
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")

    await route.fulfill(
      jsonRoute({
        success: true,
        data: [],
        pagination: {
          page: pageNumber,
          limit,
          total: 0,
        },
      }),
    )
  })
}

export async function installSignedOutAdminMocks(page: Page) {
  await page.route("**/api/v1/users/token/refresh", async (route) => {
    await route.fulfill(
      jsonRoute(
        {
          success: false,
          code: "REFRESH_TOKEN_REQUIRED",
          message: "Please log in to continue.",
        },
        401,
      ),
    )
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill(
      jsonRoute(
        {
          success: false,
          code: "ACCESS_TOKEN_REQUIRED",
          message: "Access token is required",
        },
        401,
      ),
    )
  })
}
