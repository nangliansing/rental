import { expect, test } from "@playwright/test"

import {
  adminReviewReportComment,
  adminReviewReportNote,
  adminReviewReportReasonLabel,
  installAdminReportedReviewsMocks,
} from "./fixtures/admin-reported-reviews"

test.describe("Admin reported reviews smoke", () => {
  test.describe.configure({ mode: "serial" })
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminReportedReviewsMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "Reported reviews" }).click()
    await expect(
      page.getByRole("heading", {
        name: "Reported reviews",
        level: 2,
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminReviewReportReasonLabel }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("shows the reported review detail", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: adminReviewReportReasonLabel }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Reported review", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("article").getByText(adminReviewReportComment),
    ).toBeVisible()
    await expect(
      page.getByRole("article").getByText(adminReviewReportNote),
    ).toBeVisible()
    await expect(
      page.getByText("Sam Reporter · sam@example.com"),
    ).toBeVisible()

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

  test("dismisses a review report from the review dialog", async ({ page }) => {
    await page
      .getByRole("article")
      .getByRole("button", { name: "Dismiss", exact: true })
      .click()
    await expect(
      page.getByRole("heading", { name: "Dismiss review report" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Not enough evidence" }).click()

    const dismissResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/admin\/review-reports\/[^/]+\/status$/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Dismiss report" })
      .click()
    await dismissResponse

    await expect(page.getByText("No review reports")).toBeVisible({
      timeout: 15_000,
    })
  })

  test("deletes a review from the moderation menu", async ({ page }) => {
    await page
      .getByRole("button", { name: "Open review moderation actions" })
      .click()
    await page.getByRole("button", { name: "Delete this review" }).click()
    await expect(
      page.getByRole("heading", { name: "Delete this review" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Inappropriate language" }).click()

    const deleteResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        /\/admin\/reviews\/[^/?]+$/.test(response.url()) &&
        response.ok(),
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete review" })
      .click()
    await deleteResponse

    await expect(
      page.getByText("This review has been removed."),
    ).toBeVisible({ timeout: 15_000 })
  })
})
