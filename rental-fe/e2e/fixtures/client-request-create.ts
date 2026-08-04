import type { Page, Route } from "@playwright/test"
import { expect } from "@playwright/test"

import { smokeAccessToken, smokeAuthUser } from "./authenticated-session"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

function isAuthorized(route: Route) {
  const authorization = route.request().headers().authorization ?? ""
  return authorization === `Bearer ${smokeAccessToken}`
}

export type ClientRequestCreateMockOptions = {
  failCreateOnce?: boolean
  failMessage?: string
}

export type CapturedCreateClientRequest = {
  name?: string
  description?: string
  geoSearch?: Record<string, unknown>
  filters?: Record<string, unknown>
}

/**
 * Mocks POST /api/v1/client-requests for map create-client-request smoke tests.
 * Register after authenticated-session mocks so auth routes stay in force.
 */
export async function installClientRequestCreateMocks(
  page: Page,
  options: ClientRequestCreateMockOptions = {},
) {
  const state = {
    failCreateOnce: Boolean(options.failCreateOnce),
    failMessage: options.failMessage ?? "Unable to create client request.",
    createCount: 0,
    lastBody: null as CapturedCreateClientRequest | null,
  }

  await page.route("**/api/v1/client-requests", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue()
      return
    }

    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    state.createCount += 1
    state.lastBody = route.request().postDataJSON() as CapturedCreateClientRequest

    if (state.failCreateOnce) {
      state.failCreateOnce = false
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "CLIENT_REQUEST_CREATE_FAILED",
            message: state.failMessage,
          },
          500,
        ),
      )
      return
    }

    const now = "2026-08-04T04:00:00.000Z"
    const body = state.lastBody ?? {}

    await route.fulfill(
      jsonRoute(
        {
          success: true,
          data: {
            _id: "client-request-smoke-1",
            createdBy: smokeAuthUser._id,
            name: body.name ?? "Client request",
            description: body.description ?? null,
            status: "Waiting",
            geoSearch: body.geoSearch ?? {
              mode: "area",
              bounds: {
                northEast: { lat: 14, lng: 101 },
                southWest: { lat: 13, lng: 100 },
              },
            },
            filters: body.filters ?? {},
            isDeleted: false,
            deletedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        },
        201,
      ),
    )
  })

  return {
    getCreateCount: () => state.createCount,
    getLastBody: () => state.lastBody,
  }
}

/**
 * Map mode controls (including agent actions) only mount after Maps loads.
 * Wait for them explicitly — do not treat results-panel fallback as ready.
 */
export async function waitForMapModeControls(page: Page) {
  await expect(page.getByTestId("map-mode-controls")).toBeVisible({
    timeout: 60_000,
  })
  await expect(
    page.getByRole("button", { name: "Use my location" }),
  ).toBeVisible({ timeout: 15_000 })
}

export async function waitForAgentMapActions(page: Page) {
  await waitForMapModeControls(page)
  await expect(page.getByTestId("agent-map-actions")).toBeVisible({
    timeout: 45_000,
  })
}

export async function openAgentMapActionsMenu(page: Page) {
  await waitForAgentMapActions(page)
  const trigger = page.getByTestId("agent-map-actions")

  // Radix Tooltip + Trigger nesting can make Playwright's actionability click
  // flaky on mobile; drive the native click after visibility is confirmed.
  await expect(async () => {
    await expect(trigger).toBeVisible({ timeout: 5_000 })
    await expect(trigger).toBeEnabled({ timeout: 5_000 })
    await trigger.evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })
    await expect(
      page.getByRole("menu", { name: "Agent map actions" }),
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 30_000 })
}

export async function openCreateClientRequestFromMap(page: Page) {
  await openAgentMapActionsMenu(page)
  await page.getByRole("menuitem", { name: /Make a client request/i }).click()
  await expect(
    page.getByRole("heading", { name: "Create client request" }),
  ).toBeVisible({ timeout: 15_000 })
}

export async function fillClientRequestDetails(
  page: Page,
  values: { name: string; notes?: string },
) {
  await page.getByLabel(/^Name/).fill(values.name)
  if (values.notes != null) {
    await page.getByLabel(/^Notes$/).fill(values.notes)
  }
}

export async function continueToClientRequestPreferences(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(
    page.getByRole("heading", { name: "Client preferences" }),
  ).toBeVisible({ timeout: 10_000 })
}

export async function expectClientRequestCreatedToast(page: Page) {
  await expect(
    page
      .locator('[data-slot="toast-title"]')
      .filter({ hasText: "Client request created" }),
  ).toBeVisible({ timeout: 15_000 })
}
