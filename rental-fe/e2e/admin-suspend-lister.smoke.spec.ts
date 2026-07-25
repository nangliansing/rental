import { expect, test } from "@playwright/test"

import {
  adminModerationBuildingName,
  adminSuspendListerName,
  installAdminSuspendListerMocks,
} from "./fixtures/admin-suspend-lister"

test.describe("Admin suspend lister smoke", () => {
  test.describe.configure({ mode: "serial" })
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminSuspendListerMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminModerationBuildingName }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("opens suspend lister dialog with duration and reason options", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: `Open actions for ${adminSuspendListerName}` })
      .click()
    await page.getByRole("button", { name: "Suspend lister" }).click()

    await expect(
      page.getByRole("heading", { name: "Suspend lister" }),
    ).toBeVisible()

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByText(adminSuspendListerName, { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByText("This lister is not currently suspended."),
    ).toBeVisible()
    await expect(dialog.getByRole("button", { name: "7 days" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "30 days" })).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Fake or suspicious lister" }),
    ).toBeVisible()
  })

  test("suspends a lister from the pending listings tab", async ({ page }) => {
    await page
      .getByRole("button", { name: `Open actions for ${adminSuspendListerName}` })
      .click()
    await page.getByRole("button", { name: "Suspend lister" }).click()
    await expect(
      page.getByRole("heading", { name: "Suspend lister" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "30 days" }).click()
    await page
      .getByRole("button", { name: "Repeated misleading listings" })
      .click()

    const suspendResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/admin\/suspensions(?:\?|$)/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Suspend lister" })
      .click()
    await suspendResponse

    await expect(
      page.getByRole("heading", { name: "Suspend lister" }),
    ).not.toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminModerationBuildingName }),
    ).toBeVisible()
  })
})
