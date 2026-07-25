import { expect, test } from "@playwright/test"

import {
  installAdminPanelMocks,
  installSignedOutAdminMocks,
} from "./fixtures/admin-session"

test.describe("Admin panel smoke", () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test("requires sign-in before opening the admin panel", async ({ page }) => {
    await installSignedOutAdminMocks(page)
    await page.goto("/admin")

    await expect(page.getByText("Admin sign in required")).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?redirect=/admin",
    )
  })

  test("blocks non-admin users", async ({ page }) => {
    await installAdminPanelMocks(page, { role: "USER" })
    await page.goto("/admin")

    await expect(
      page.getByRole("heading", { name: "Admin access required" }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("loads the review center for admin users", async ({ page }) => {
    await installAdminPanelMocks(page, { role: "ADMIN" })
    await page.goto("/admin")

    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("button", { name: "Pending listings" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Pending listings", level: 2, exact: true }),
    ).toBeVisible()
    await expect(page.getByText("ADMIN", { exact: true })).toBeVisible()
  })
})
