import { expect, test } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
} from "./fixtures/authenticated-session"
import { skipIfCiPlaceholderMapsKey } from "./fixtures/ci-maps"
import {
  continueToSavedSearchListers,
  continueToSavedSearchPreferences,
  expectSavedSearchCreatedToast,
  fillSavedSearchDetails,
  installSavedSearchCreateMocks,
  openAgentMapActionsMenu,
  openCreateSavedSearchFromMap,
  waitForAgentMapActions,
  waitForMapModeControls,
} from "./fixtures/saved-search-create"
import {
  areaSearchUrl,
  lineSearchUrl,
  nearbySearchUrl,
} from "./fixtures/map-search-buildings"
import { installMapSearchApiMocks, waitForMapReady } from "./fixtures/map-search-routes"

async function prepareAgentMapPage(
  page: import("@playwright/test").Page,
  url: string,
  options?: { hasAgentProfile?: boolean; failCreateOnce?: boolean },
) {
  // Register anonymous map mocks first, then auth mocks so auth routes win (LIFO).
  await installMapSearchApiMocks(page)
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: options?.hasAgentProfile ?? true,
  })
  const createMocks = await installSavedSearchCreateMocks(page, {
    failCreateOnce: options?.failCreateOnce,
  })

  await page.goto(url)
  // Agent actions live on SearchAreaButton, which only mounts when Maps is ready.
  await waitForMapReady(page, { requireMap: true })

  if (options?.hasAgentProfile === false) {
    await waitForMapModeControls(page)
    // Let agent-profile 404 settle before asserting absence.
    await expect(page.getByTestId("agent-map-actions")).toHaveCount(0, {
      timeout: 15_000,
    })
  } else {
    await waitForAgentMapActions(page)
  }

  return createMocks
}

test.describe("Create saved search from map", () => {
  test.beforeEach(() => {
    // Same gate as other map-control smoke suites: placeholder Maps key never
    // mounts SearchAreaButton / agent-map-actions in CI.
    skipIfCiPlaceholderMapsKey(test)
  })

  test("happy path: area search → details → preferences → listers → create → toast", async ({
    page,
  }) => {
    const createMocks = await prepareAgentMapPage(page, areaSearchUrl)

    await openCreateSavedSearchFromMap(page)

    await expect(page.getByText("Visible map area")).toBeVisible()
    await expect(
      page.getByRole("status", { name: "Step 1 of 3" }),
    ).toBeVisible()

    await fillSavedSearchDetails(page, {
      name: "Family near Bang Kapi",
      notes: "LINE: family01",
    })
    await continueToSavedSearchPreferences(page)

    await expect(
      page.getByRole("status", { name: "Step 2 of 3" }),
    ).toBeVisible()
    await expect(page.getByText("Visible map area")).toHaveCount(0)

    await continueToSavedSearchListers(page)
    await expect(
      page.getByRole("status", { name: "Step 3 of 3" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Save search" }).click()

    await expectSavedSearchCreatedToast(page)
    await expect(
      page.getByRole("heading", { name: "Create saved search" }),
    ).toHaveCount(0)

    await expect.poll(() => createMocks.getCreateCount()).toBe(1)
    expect(createMocks.getLastBody()).toMatchObject({
      name: "Family near Bang Kapi",
      description: "LINE: family01",
      geoSearch: {
        mode: "area",
      },
    })
  })

  test("blocks continue when name is empty", async ({ page }) => {
    await prepareAgentMapPage(page, areaSearchUrl)
    await openCreateSavedSearchFromMap(page)

    await page.getByRole("button", { name: "Continue" }).click()

    await expect(page.getByText("Enter a name for this search.")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Create saved search" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Client preferences" }),
    ).toHaveCount(0)
  })

  test("cancel and close dismiss the wizard without creating", async ({
    page,
  }) => {
    const createMocks = await prepareAgentMapPage(page, areaSearchUrl)

    await openCreateSavedSearchFromMap(page)
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(
      page.getByRole("heading", { name: "Create saved search" }),
    ).toHaveCount(0)

    await openCreateSavedSearchFromMap(page)
    await page
      .getByRole("button", { name: "Close create saved search" })
      .click()
    await expect(
      page.getByRole("heading", { name: "Create saved search" }),
    ).toHaveCount(0)

    expect(createMocks.getCreateCount()).toBe(0)
  })

  test("back from preferences restores details with the same name", async ({
    page,
  }) => {
    await prepareAgentMapPage(page, areaSearchUrl)
    await openCreateSavedSearchFromMap(page)

    await fillSavedSearchDetails(page, { name: "Keep my name" })
    await continueToSavedSearchPreferences(page)

    await page.getByRole("button", { name: "Back" }).click()

    await expect(
      page.getByRole("heading", { name: "Create saved search" }),
    ).toBeVisible()
    await expect(page.getByLabel(/^Name/)).toHaveValue("Keep my name")
    await expect(
      page.getByRole("status", { name: "Step 1 of 3" }),
    ).toBeVisible()
  })

  test("creates from a nearby pin search", async ({ page }) => {
    const createMocks = await prepareAgentMapPage(page, nearbySearchUrl)
    await openCreateSavedSearchFromMap(page)

    await expect(page.getByText("Pinned location", { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await fillSavedSearchDetails(page, { name: "Near BTS pin" })
    await continueToSavedSearchPreferences(page)
    await continueToSavedSearchListers(page)
    await page.getByRole("button", { name: "Save search" }).click()

    await expectSavedSearchCreatedToast(page)
    await expect.poll(() => createMocks.getCreateCount()).toBe(1)
    expect(createMocks.getLastBody()?.geoSearch).toMatchObject({
      mode: "nearby",
      radiusMeters: 1000,
    })
  })

  test("creates from a line search", async ({ page }) => {
    const createMocks = await prepareAgentMapPage(page, lineSearchUrl)
    await openCreateSavedSearchFromMap(page)

    await expect(page.getByText("Search line", { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await fillSavedSearchDetails(page, { name: "Along line" })
    await continueToSavedSearchPreferences(page)
    await continueToSavedSearchListers(page)
    await page.getByRole("button", { name: "Save search" }).click()

    await expectSavedSearchCreatedToast(page)
    await expect.poll(() => createMocks.getCreateCount()).toBe(1)
    expect(createMocks.getLastBody()?.geoSearch).toMatchObject({
      mode: "line",
      distanceMeters: 500,
    })
  })

  test("shows create failure on listers and allows retry", async ({
    page,
  }) => {
    const createMocks = await prepareAgentMapPage(page, areaSearchUrl, {
      failCreateOnce: true,
    })

    await openCreateSavedSearchFromMap(page)
    await fillSavedSearchDetails(page, { name: "Retry search" })
    await continueToSavedSearchPreferences(page)
    await continueToSavedSearchListers(page)

    await page.getByRole("button", { name: "Save search" }).click()
    await expect(page.getByRole("alert")).toContainText(
      "Unable to create saved search.",
    )
    await expect(
      page.getByRole("heading", { name: "Preferred listers" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Save search" }).click()
    await expectSavedSearchCreatedToast(page)
    await expect.poll(() => createMocks.getCreateCount()).toBe(2)
  })

  test("hides agent map actions when the user has no agent profile", async ({
    page,
  }) => {
    await prepareAgentMapPage(page, areaSearchUrl, {
      hasAgentProfile: false,
    })

    await expect(page.getByTestId("map-mode-controls")).toBeVisible()
    await expect(page.getByTestId("agent-map-actions")).toHaveCount(0)
  })

  test("listing mode toggle is available from the agent menu", async ({
    page,
  }) => {
    await prepareAgentMapPage(page, areaSearchUrl)
    await openAgentMapActionsMenu(page)

    await page.getByRole("menuitem", { name: /Enter listing mode/i }).click()
    await expect(page).toHaveURL(/purpose=list/)
  })

  test("availability picker stays usable inside the create wizard", async ({
    page,
  }) => {
    await prepareAgentMapPage(page, areaSearchUrl)
    await openCreateSavedSearchFromMap(page)
    await fillSavedSearchDetails(page, { name: "With availability" })
    await continueToSavedSearchPreferences(page)

    const flexible = page.getByRole("button", { name: /Flexible/i }).first()
    await expect(flexible).toBeVisible()
    await flexible.click()

    const picker = page.getByRole("dialog", { name: "Need a room by" })
    await expect(picker).toBeVisible({ timeout: 10_000 })
    await picker.getByRole("button", { name: "Today" }).click()
    await expect(picker).toHaveCount(0)

    await expect(
      page.getByRole("heading", { name: "Client preferences" }),
    ).toBeVisible()
  })
})
