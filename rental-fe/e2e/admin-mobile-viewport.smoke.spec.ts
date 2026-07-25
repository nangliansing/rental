import { expect, test } from "@playwright/test"

import { installAdminPanelMocks } from "./fixtures/admin-session"

const mobileViewportMessage =
  "Admin review needs room for photos, building data, listing details, and approval actions."

test.describe("Admin mobile viewport smoke", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await installAdminPanelMocks(page, { role: "ADMIN" })
  })

  test("shows the larger-screen message on a phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/admin")

    await expect(
      page.getByRole("heading", { name: "Use a larger screen" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(mobileViewportMessage)).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).not.toBeVisible()
    await expect(
      page.getByRole("button", { name: "Pending listings" }),
    ).not.toBeVisible()
  })

  test("hides the review center just below the desktop breakpoint", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1023, height: 900 })
    await page.goto("/admin")

    await expect(
      page.getByRole("heading", { name: "Use a larger screen" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).not.toBeVisible()
    await expect(
      page.getByRole("button", { name: "Pending listings" }),
    ).not.toBeVisible()
  })
})
