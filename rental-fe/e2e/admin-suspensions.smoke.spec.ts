import { expect, test } from "@playwright/test"

import {
  adminSuspensionReason,
  adminSuspensionUserName,
  installAdminSuspensionsMocks,
} from "./fixtures/admin-suspensions"

test.describe("Admin suspensions smoke", () => {
  test.describe.configure({ mode: "serial" })
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminSuspensionsMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "Suspensions" }).click()
    await expect(
      page.getByRole("heading", {
        name: "Suspensions",
        level: 2,
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminSuspensionUserName }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("shows the active suspension detail", async ({ page }) => {
    const detail = page.getByRole("article")

    await expect(
      page.getByRole("heading", { name: adminSuspensionUserName }),
    ).toBeVisible()
    await expect(detail.getByText(adminSuspensionReason)).toBeVisible()
    await expect(
      detail.getByText("jessie@example.com", { exact: true }),
    ).toBeVisible()
    await expect(
      detail.getByRole("button", { name: "Lift suspension" }),
    ).toBeVisible()
  })

  test("opens lift suspension dialog with reason options", async ({
    page,
  }) => {
    await page
      .getByRole("article")
      .getByRole("button", { name: "Lift suspension" })
      .click()

    await expect(
      page.getByRole("heading", { name: "Lift suspension" }),
    ).toBeVisible()

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByText(adminSuspensionUserName, { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "Issue resolved after review" }),
    ).toBeVisible()
    await expect(
      dialog.getByRole("button", {
        name: "Suspension was applied by mistake",
      }),
    ).toBeVisible()
  })

  test("lifts an active suspension from the suspensions tab", async ({
    page,
  }) => {
    await page
      .getByRole("article")
      .getByRole("button", { name: "Lift suspension" })
      .click()
    await expect(
      page.getByRole("heading", { name: "Lift suspension" }),
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Issue resolved after review" })
      .click()

    const liftResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/admin\/suspensions\/[^/]+\/lift$/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lift suspension" })
      .click()
    await liftResponse

    await expect(
      page.getByRole("heading", { name: "Lift suspension" }),
    ).not.toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("No suspensions")).toBeVisible({
      timeout: 15_000,
    })
  })
})
