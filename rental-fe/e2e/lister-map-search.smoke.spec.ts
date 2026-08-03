import { expect, test } from "@playwright/test"

import {
  smokeAgentProfile,
  installAuthenticatedSessionMocks,
  waitForAuthenticatedProfile,
} from "./fixtures/authenticated-session"
import { skipIfCiPlaceholderMapsKey } from "./fixtures/ci-maps"
import { installListingGridSessionMocks } from "./fixtures/listing-grid-session"
import {
  buildListerMapSearchSmokeUrl,
  installListerMapSearchMocks,
  listerMapSearchUrl,
} from "./fixtures/lister-map-search-routes"
import {
  clickMapControlButton,
  getMobileResultsPanel,
  waitForAreaSearchResults,
} from "./fixtures/map-search-helpers"
import { smokeAreaBuilding } from "./fixtures/map-search-buildings"
import { waitForMapReady } from "./fixtures/map-search-routes"

const ARRIVAL_TOAST_PATTERN = new RegExp(
  `Search an area to see ${smokeAgentProfile.displayName}'s listings`,
)

async function expectArrivalToast(page: import("@playwright/test").Page) {
  await expect(page.getByText(ARRIVAL_TOAST_PATTERN)).toBeVisible({
    timeout: 15_000,
  })
}

async function expectStableAgentProfileFetchCount(
  observedCount: () => number,
  maxCalls: number,
) {
  await expect
    .poll(
      () => observedCount(),
      {
        timeout: 3_000,
        message: "Agent profile fetch count should stabilize",
      },
    )
    .toBeLessThanOrEqual(maxCalls)

  await pageWait(1_500)

  expect(observedCount()).toBeLessThanOrEqual(maxCalls)
}

function pageWait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test.describe("Lister map search smoke", () => {
  test("hydrates a lister filter from the URL, shows the arrival toast, and avoids fetch loops", async ({
    page,
  }) => {
    let agentProfileFetchCount = 0

    await installListerMapSearchMocks(page, {
      onAgentProfileRequest: () => {
        agentProfileFetchCount += 1
      },
    })

    await page.goto(listerMapSearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await expect(page).toHaveURL(/filters=/)
    await expectArrivalToast(page)

    await expectStableAgentProfileFetchCount(
      () => agentProfileFetchCount,
      1,
    )

    expect(await getMobileResultsPanel(page).count()).toBe(0)
  })

  test("navigates from the signed-in profile with router seed and avoids agent refetch loops", async ({
    page,
  }) => {
    let agentProfileFetchCount = 0

    await installAuthenticatedSessionMocks(page)
    await installListerMapSearchMocks(page, {
      onAgentProfileRequest: () => {
        agentProfileFetchCount += 1
      },
    })

    await page.goto("/profile")
    await waitForAuthenticatedProfile(page)

    await page
      .getByRole("link", {
        name: `Search ${smokeAgentProfile.displayName}'s listings on map`,
      })
      .click()

    await waitForMapReady(page, { requireMap: false })
    await expect(page).toHaveURL(/agent-smoke-1/)
    await expectArrivalToast(page)

    await expectStableAgentProfileFetchCount(
      () => agentProfileFetchCount,
      0,
    )
  })

  test("navigates from a public lister profile to map search with the lister filter applied", async ({
    page,
  }) => {
    await installListingGridSessionMocks(page)
    await installListerMapSearchMocks(page)

    await page.goto(`/listers/${smokeAgentProfile._id}`)

    await expect(
      page.getByRole("heading", {
        name: smokeAgentProfile.displayName,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 })

    await page
      .getByRole("link", {
        name: `Search ${smokeAgentProfile.displayName}'s listings on map`,
      })
      .click()

    await waitForMapReady(page, { requireMap: false })
    await expect(page).toHaveURL(/agent-smoke-1/)
    await expectArrivalToast(page)
  })

  test("commits an area search that keeps the lister filter scoped", async ({
    page,
  }) => {
    skipIfCiPlaceholderMapsKey(test)

    await installListerMapSearchMocks(page)
    await page.goto(listerMapSearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await expectArrivalToast(page)

    const areaSearchRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/api/v1/search/buildings/map") &&
        request.method() === "POST",
    )

    await clickMapControlButton(page, "Search this area")

    const request = await areaSearchRequest
    const requestBody = request.postDataJSON() as {
      agentProfileIds?: string[]
    }

    expect(requestBody.agentProfileIds).toEqual([smokeAgentProfile._id])

    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(
      mobilePanel.getByRole("button", {
        name: `Remove ${smokeAgentProfile.displayName} from search`,
      }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("direct URL entry without router seed fetches the lister profile at most once", async ({
    page,
  }) => {
    let agentProfileFetchCount = 0

    await installListerMapSearchMocks(page, {
      onAgentProfileRequest: () => {
        agentProfileFetchCount += 1
      },
    })

    await page.goto(buildListerMapSearchSmokeUrl(smokeAgentProfile._id))

    await waitForMapReady(page, { requireMap: false })

    await expect
      .poll(() => agentProfileFetchCount, { timeout: 10_000 })
      .toBeGreaterThan(0)

    await expectStableAgentProfileFetchCount(
      () => agentProfileFetchCount,
      1,
    )
  })
})
