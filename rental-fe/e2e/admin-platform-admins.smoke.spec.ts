import { expect, test } from "@playwright/test"

import {
  adminPlatformAdminEmail,
  adminPlatformAdminName,
  adminPlatformOwnerName,
  installAdminPlatformAdminsMocks,
} from "./fixtures/admin-platform-admins"

test.describe("Admin platform admins smoke", () => {
  test.describe.configure({ mode: "serial" })
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminPlatformAdminsMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "Administrators" }).click()
    await expect(
      page.getByRole("heading", {
        name: "Administrators",
        level: 2,
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminPlatformAdminName }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("shows the platform admin detail for owner users", async ({ page }) => {
    const detail = page.getByRole("article")

    await expect(
      page.getByRole("heading", { name: adminPlatformAdminName }),
    ).toBeVisible()
    await expect(
      detail.getByText(adminPlatformAdminEmail, { exact: true }),
    ).toBeVisible()
    await expect(detail.getByText("ACTIVE · GOOGLE")).toBeVisible()
    await expect(
      detail.getByRole("button", { name: "Remove admin" }),
    ).toBeVisible()
  })

  test("opens remove admin dialog with account summary", async ({ page }) => {
    await page
      .getByRole("article")
      .getByRole("button", { name: "Remove admin" })
      .click()

    await expect(
      page.getByRole("heading", { name: "Remove admin access" }),
    ).toBeVisible()

    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByText(adminPlatformAdminName, { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByText(adminPlatformAdminEmail, { exact: true }),
    ).toBeVisible()
    await expect(dialog.getByText("Current role · ADMIN")).toBeVisible()
  })

  test("removes admin role from the administrators tab", async ({ page }) => {
    await page
      .getByRole("article")
      .getByRole("button", { name: "Remove admin" })
      .click()
    await expect(
      page.getByRole("heading", { name: "Remove admin access" }),
    ).toBeVisible()

    const removeResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/admin\/users\/[^/]+\/remove-admin$/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove admin" })
      .click()
    await removeResponse

    await expect(
      page.getByRole("heading", { name: "Remove admin access" }),
    ).not.toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminPlatformAdminName }),
    ).not.toBeVisible()
    await expect(
      page.getByRole("heading", { name: adminPlatformOwnerName }),
    ).toBeVisible({ timeout: 15_000 })
  })
})
