import { loadEnv } from "vite"
import { expect, test, type Locator, type Page } from "@playwright/test"

import {
  installBuildingListingGridRoute,
  installListingGridSessionMocks,
  waitForAuthenticatedProfile,
} from "./fixtures/listing-grid-session"
import { smokeAgentProfile } from "./fixtures/authenticated-session"
import { smokeListingBuilding } from "./fixtures/lister-onboarding"
import {
  getMobileResultsPanel,
  waitForAreaSearchResults,
} from "./fixtures/map-search-helpers"
import {
  installMapSearchApiMocks,
  waitForMapReady,
} from "./fixtures/map-search-routes"
import {
  areaSearchUrl,
  smokeAreaBuilding,
} from "./fixtures/map-search-buildings"

const env = loadEnv("development", process.cwd(), "")
const hasMapsKey = Boolean(
  (process.env.VITE_GOOGLE_MAPS_API_KEY ?? env.VITE_GOOGLE_MAPS_API_KEY)?.trim(),
)

const LISTING_GRID_VIRTUALIZATION_THRESHOLD = 24
const PUBLIC_GRID_LISTING_COUNT = 29
const LATEST_SORTED_LISTING_LABEL = "Open listing ฿30k"
const OLDEST_SORTED_LISTING_LABEL = "Open listing ฿14k"
const BUILDING_PAGE_LISTING_LABEL = OLDEST_SORTED_LISTING_LABEL

function openListingButtons(scope: Page | Locator) {
  return scope.getByRole("button", { name: /^Open listing / })
}

async function countViewportOpenListingButtons(page: Page) {
  return page.evaluate(() => {
    const viewportHeight = window.innerHeight

    return Array.from(
      document.querySelectorAll('button[aria-label^="Open listing "]'),
    ).filter((button) => {
      const rect = button.getBoundingClientRect()
      return rect.top < viewportHeight && rect.bottom > 0
    }).length
  })
}

async function expectLazyCoverImages(scope: Page | Locator) {
  const lazyImages = scope.locator('img[loading="lazy"]')
  await expect(lazyImages.first()).toBeVisible({ timeout: 15_000 })
  expect(await lazyImages.count()).toBeGreaterThan(0)
}

async function expectNoProgressiveGridPlaceholders(scope: Page | Locator) {
  await expect(scope.getByTestId("progressive-cover-placeholder")).toHaveCount(0)
}

async function expectVirtualizedWindow(
  page: Page,
  loadedCount: number,
  scope?: Locator,
) {
  if (loadedCount < LISTING_GRID_VIRTUALIZATION_THRESHOLD) {
    return
  }

  if (scope) {
    const renderedCards = await openListingButtons(scope).count()
    expect(renderedCards).toBeGreaterThan(0)
    expect(renderedCards).toBeLessThan(loadedCount)
    return
  }

  await page.evaluate(() => window.scrollTo(0, 0))

  const renderedCards = await countViewportOpenListingButtons(page)
  expect(renderedCards).toBeGreaterThan(0)
  expect(renderedCards).toBeLessThan(loadedCount)
}

async function loadNextGridPage(page: Page, scope: Page | Locator = page) {
  await page.keyboard.press("End")

  const loadMore = scope.getByRole("button", { name: "Load more" }).first()
  if (await loadMore.isVisible().catch(() => false)) {
    await loadMore.evaluate((button) => button.click())
    await expect(scope.getByText("Loading more...").first()).toBeHidden({
      timeout: 15_000,
    })
  }
}

async function loadAllGridListings(page: Page, scope: Page | Locator = page) {
  const noMoreListings = scope.getByText("No more listings").first()

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await noMoreListings.isVisible().catch(() => false)) {
      return
    }

    await loadNextGridPage(page, scope)
  }

  await expect(noMoreListings).toBeVisible({ timeout: 15_000 })
}

async function waitForListingButton(
  scope: Page | Locator,
  label: string,
) {
  await expect(scope.getByRole("button", { name: label }).first()).toBeVisible({
    timeout: 15_000,
  })
}

test.describe("Listing grid smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installListingGridSessionMocks(page)
  })

  test("profile grid virtualizes, lazy-loads images, paginates, and opens preview", async ({
    page,
  }) => {
    await page.goto("/profile")
    await waitForAuthenticatedProfile(page)

    await waitForListingButton(page, LATEST_SORTED_LISTING_LABEL)
    await expectLazyCoverImages(page)
    await expectNoProgressiveGridPlaceholders(page)

    await loadNextGridPage(page)
    await expectVirtualizedWindow(page, PUBLIC_GRID_LISTING_COUNT)

    await loadAllGridListings(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await waitForListingButton(page, LATEST_SORTED_LISTING_LABEL)

    await page.getByRole("button", { name: OLDEST_SORTED_LISTING_LABEL }).first().click()
    await expect(
      page.getByRole("dialog", { name: "Preview listing ฿14k" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("dialog")).toHaveCount(1)

    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 })
  })

  test("lister profile grid virtualizes listings and opens shared preview", async ({
    page,
  }) => {
    await page.goto(`/listers/${smokeAgentProfile._id}`)

    await expect(
      page.getByRole("heading", { name: smokeAgentProfile.displayName, level: 1 }),
    ).toBeVisible({ timeout: 15_000 })
    await waitForListingButton(page, LATEST_SORTED_LISTING_LABEL)

    await expectLazyCoverImages(page)
    await expectNoProgressiveGridPlaceholders(page)
    await loadNextGridPage(page)
    await expectVirtualizedWindow(page, PUBLIC_GRID_LISTING_COUNT)

    await page.getByRole("button", { name: LATEST_SORTED_LISTING_LABEL }).first().click()
    await expect(
      page.getByRole("dialog", { name: "Preview listing ฿30k" }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("building page grid virtualizes, paginates, and previews with link handoff", async ({
    page,
  }) => {
    await page.goto(`/buildings/${smokeListingBuilding._id}`)

    await expect(
      page.getByRole("heading", { name: smokeListingBuilding.name, level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    const grid = page.getByTestId("building-listing-grid")
    await expect(grid).toBeVisible()
    await waitForListingButton(grid, BUILDING_PAGE_LISTING_LABEL)

    await expectLazyCoverImages(grid)
    await expectNoProgressiveGridPlaceholders(grid)
    await loadNextGridPage(page, grid)
    await expectVirtualizedWindow(page, PUBLIC_GRID_LISTING_COUNT)

    await grid.getByRole("button", { name: BUILDING_PAGE_LISTING_LABEL }).first().click()
    await expect(
      page.getByRole("dialog", { name: "Preview listing ฿14k" }),
    ).toBeVisible({ timeout: 15_000 })

    await page
      .getByRole("link", {
        name: "Preview listing ฿14k. Tap for full details.",
      })
      .click()

    await expect(page).toHaveURL(/\/listings\/listing-smoke-1$/, { timeout: 15_000 })
  })

  test("map building detail grid virtualizes and opens shared preview", async ({
    page,
  }) => {
    test.skip(
      !hasMapsKey,
      "Set VITE_GOOGLE_MAPS_API_KEY in .env to run map building detail grid smoke.",
    )

    await installMapSearchApiMocks(page)
    await installBuildingListingGridRoute(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = getMobileResultsPanel(page)
    await mobilePanel
      .getByRole("button", { name: new RegExp(smokeAreaBuilding.name) })
      .click()

    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible({ timeout: 15_000 })

    const grid = mobilePanel.getByTestId("building-listing-grid")
    await expect(grid).toBeVisible()
    await waitForListingButton(grid, BUILDING_PAGE_LISTING_LABEL)

    await expectLazyCoverImages(grid)
    await expectNoProgressiveGridPlaceholders(grid)
    await loadNextGridPage(page, mobilePanel)
    await waitForListingButton(grid, BUILDING_PAGE_LISTING_LABEL)
    await expectVirtualizedWindow(page, PUBLIC_GRID_LISTING_COUNT, grid)

    await grid.getByRole("button", { name: BUILDING_PAGE_LISTING_LABEL }).first().click()
    await expect(
      page.getByRole("dialog", { name: "Preview listing ฿14k" }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("saved tab keeps the lightweight grid card behavior", async ({ page }) => {
    await page.goto("/profile")
    await waitForAuthenticatedProfile(page)
    await page.getByRole("tab", { name: "Saved" }).click()

    const savedCard = page.getByRole("button", { name: "Open saved listing ฿14k" })
    await expect(savedCard).toBeVisible()

    await expectLazyCoverImages(page)
    await expectNoProgressiveGridPlaceholders(page)

    await savedCard.click()
    await expect(page.getByRole("dialog", { name: "Listing details" })).toBeVisible({
      timeout: 15_000,
    })
  })

  test("pending tab renders lightweight grid cards and opens the overlay", async ({
    page,
  }) => {
    await installListingGridSessionMocks(page, { withPendingPost: true })
    await page.goto("/profile")
    await waitForAuthenticatedProfile(page)

    await page.getByRole("tab", { name: "Pending" }).click()

    const pendingCard = page.getByRole("button", {
      name: `Open pending submission ${smokeListingBuilding.name}`,
    })
    await expect(pendingCard).toBeVisible({ timeout: 15_000 })

    await expectLazyCoverImages(page)
    await expectNoProgressiveGridPlaceholders(page)

    await pendingCard.click()
    await expect(
      page.getByRole("heading", {
        name: smokeListingBuilding.name,
        level: 2,
      }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("keeps scroll responsive after loading paginated listings", async ({
    page,
  }) => {
    await page.goto("/profile")
    await waitForAuthenticatedProfile(page)

    await loadNextGridPage(page)

    await page.evaluate(() => window.scrollTo(0, 0))
    await waitForListingButton(page, LATEST_SORTED_LISTING_LABEL)

    await page.keyboard.press("End")
    await waitForListingButton(page, OLDEST_SORTED_LISTING_LABEL)

    await page.evaluate(() => window.scrollTo(0, 0))
    await waitForListingButton(page, LATEST_SORTED_LISTING_LABEL)
  })
})
