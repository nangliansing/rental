import { expect, test } from "@playwright/test"

import {
  adminModerationBuildingName,
  installAdminModerationMocks,
} from "./fixtures/admin-moderation"

test.describe("Admin moderation smoke", () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminModerationMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminModerationBuildingName }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("approves a pending submission from the review dialog", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Approve", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "Approve and publish" }),
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Submission is complete and ready to publish" })
      .click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Approve and publish" })
      .click()

    await expect(page.getByText("No pending listings")).toBeVisible({
      timeout: 15_000,
    })
  })

  test("rejects a pending submission from the review dialog", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Reject", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "Reject submission" }),
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Room details or pricing look incorrect" })
      .click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Reject submission" })
      .click()

    await expect(page.getByText("No pending listings")).toBeVisible({
      timeout: 15_000,
    })
  })
})
