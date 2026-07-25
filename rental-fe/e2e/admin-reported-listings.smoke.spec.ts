import { expect, test } from "@playwright/test"

import {
  adminReportBuildingName,
  adminReportNote,
  adminReportReasonLabel,
  installAdminReportedListingsMocks,
} from "./fixtures/admin-reported-listings"

test.describe("Admin reported listings smoke", () => {
  test.describe.configure({ mode: "serial" })
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminReportedListingsMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "Reported listings" }).click()
    await expect(
      page.getByRole("heading", {
        name: "Reported listings",
        level: 2,
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminReportReasonLabel }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("shows the reported listing detail", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: adminReportReasonLabel }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Reported listing", exact: true }),
    ).toBeVisible()
    await expect(page.getByText(adminReportBuildingName, { exact: true })).toBeVisible()
    await expect(
      page.getByRole("article").getByText(adminReportNote),
    ).toBeVisible()
    await expect(page.getByText("Alex Renter · alex@example.com")).toBeVisible()
    const detail = page.getByRole("article")
    await expect(
      detail.getByRole("button", { name: "Dismiss", exact: true }),
    ).toBeVisible()
    await expect(
      detail.getByRole("button", { name: "Mark reviewed" }),
    ).toBeVisible()
    await expect(
      detail.getByRole("button", { name: "Action taken" }),
    ).toBeVisible()
  })

  test("dismisses a report from the review dialog", async ({ page }) => {
    await page
      .getByRole("article")
      .getByRole("button", { name: "Dismiss", exact: true })
      .click()
    await expect(
      page.getByRole("heading", { name: "Dismiss report" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Not enough evidence" }).click()

    const dismissResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/admin\/reports\/[^/]+\/status$/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Dismiss report" })
      .click()
    await dismissResponse

    await expect(page.getByText("No reports")).toBeVisible({
      timeout: 15_000,
    })
  })

  test("deletes a listing from the moderation menu", async ({ page }) => {
    await page
      .getByRole("button", { name: "Open listing moderation actions" })
      .click()
    await page.getByRole("button", { name: "Delete listing" }).click()
    await expect(
      page.getByRole("heading", { name: "Delete listing" }),
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Fake or misleading listing" })
      .click()

    const deleteResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        /\/admin\/listings\/[^/?]+$/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete listing" })
      .click()
    await deleteResponse

    await expect(
      page.getByText("This listing has been removed."),
    ).toBeVisible({ timeout: 15_000 })
  })
})
