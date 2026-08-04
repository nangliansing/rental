import { expect, test } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
} from "./fixtures/authenticated-session"
import {
  continueToClientRequestPreferences,
  expectClientRequestCreatedToast,
  fillClientRequestDetails,
  installClientRequestCreateMocks,
  openAgentMapActionsMenu,
  openCreateClientRequestFromMap,
} from "./fixtures/client-request-create"
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
  await installMapSearchApiMocks(page)
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: options?.hasAgentProfile ?? true,
  })
  const createMocks = await installClientRequestCreateMocks(page, {
    failCreateOnce: options?.failCreateOnce,
  })

  await page.goto(url)
  await waitForMapReady(page, { requireMap: false })

  return createMocks
}

test.describe("Create client request from map", () => {
  test("happy path: area search → details → preferences → create → toast", async ({
    page,
  }) => {
    const createMocks = await prepareAgentMapPage(page, areaSearchUrl)

    await openCreateClientRequestFromMap(page)

    await expect(page.getByText("Visible map area")).toBeVisible()
    await expect(
      page.getByRole("status", { name: "Step 1 of 2" }),
    ).toBeVisible()

    await fillClientRequestDetails(page, {
      name: "Family near Bang Kapi",
      notes: "LINE: family01",
    })
    await continueToClientRequestPreferences(page)

    await expect(
      page.getByRole("status", { name: "Step 2 of 2" }),
    ).toBeVisible()
    await expect(page.getByText("Visible map area")).toHaveCount(0)

    await page.getByRole("button", { name: "Create request" }).click()

    await expectClientRequestCreatedToast(page)
    await expect(
      page.getByRole("heading", { name: "Create client request" }),
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
    await openCreateClientRequestFromMap(page)

    await page.getByRole("button", { name: "Continue" }).click()

    await expect(page.getByText("Enter a name for this request.")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Create client request" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Client preferences" }),
    ).toHaveCount(0)
  })

  test("cancel and close dismiss the wizard without creating", async ({
    page,
  }) => {
    const createMocks = await prepareAgentMapPage(page, areaSearchUrl)

    await openCreateClientRequestFromMap(page)
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(
      page.getByRole("heading", { name: "Create client request" }),
    ).toHaveCount(0)

    await openCreateClientRequestFromMap(page)
    await page
      .getByRole("button", { name: "Close create client request" })
      .click()
    await expect(
      page.getByRole("heading", { name: "Create client request" }),
    ).toHaveCount(0)

    expect(createMocks.getCreateCount()).toBe(0)
  })

  test("back from preferences restores details with the same name", async ({
    page,
  }) => {
    await prepareAgentMapPage(page, areaSearchUrl)
    await openCreateClientRequestFromMap(page)

    await fillClientRequestDetails(page, { name: "Keep my name" })
    await continueToClientRequestPreferences(page)

    await page.getByRole("button", { name: "Back" }).click()

    await expect(
      page.getByRole("heading", { name: "Create client request" }),
    ).toBeVisible()
    await expect(page.getByLabel(/^Name/)).toHaveValue("Keep my name")
    await expect(
      page.getByRole("status", { name: "Step 1 of 2" }),
    ).toBeVisible()
  })

  test("creates from a nearby pin search", async ({ page }) => {
    const createMocks = await prepareAgentMapPage(page, nearbySearchUrl)
    await openCreateClientRequestFromMap(page)

    await expect(page.getByText("Pinned location", { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await fillClientRequestDetails(page, { name: "Near BTS pin" })
    await continueToClientRequestPreferences(page)
    await page.getByRole("button", { name: "Create request" }).click()

    await expectClientRequestCreatedToast(page)
    await expect.poll(() => createMocks.getCreateCount()).toBe(1)
    expect(createMocks.getLastBody()?.geoSearch).toMatchObject({
      mode: "nearby",
      radiusMeters: 1000,
    })
  })

  test("creates from a line search", async ({ page }) => {
    const createMocks = await prepareAgentMapPage(page, lineSearchUrl)
    await openCreateClientRequestFromMap(page)

    await expect(page.getByText("Search line", { exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await fillClientRequestDetails(page, { name: "Along line" })
    await continueToClientRequestPreferences(page)
    await page.getByRole("button", { name: "Create request" }).click()

    await expectClientRequestCreatedToast(page)
    await expect.poll(() => createMocks.getCreateCount()).toBe(1)
    expect(createMocks.getLastBody()?.geoSearch).toMatchObject({
      mode: "line",
      distanceMeters: 500,
    })
  })

  test("shows create failure on preferences and allows retry", async ({
    page,
  }) => {
    const createMocks = await prepareAgentMapPage(page, areaSearchUrl, {
      failCreateOnce: true,
    })

    await openCreateClientRequestFromMap(page)
    await fillClientRequestDetails(page, { name: "Retry request" })
    await continueToClientRequestPreferences(page)

    await page.getByRole("button", { name: "Create request" }).click()
    await expect(page.getByRole("alert")).toContainText(
      "Unable to create client request.",
    )
    await expect(
      page.getByRole("heading", { name: "Client preferences" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Create request" }).click()
    await expectClientRequestCreatedToast(page)
    await expect.poll(() => createMocks.getCreateCount()).toBe(2)
  })

  test("hides agent map actions when the user has no agent profile", async ({
    page,
  }) => {
    await prepareAgentMapPage(page, areaSearchUrl, {
      hasAgentProfile: false,
    })

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
    await openCreateClientRequestFromMap(page)
    await fillClientRequestDetails(page, { name: "With availability" })
    await continueToClientRequestPreferences(page)

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
