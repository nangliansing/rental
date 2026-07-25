import { expect, test } from "@playwright/test"

import {
  adminBuildingEditDiffTitle,
  adminBuildingEditOriginalName,
  adminBuildingEditProposedName,
  installAdminBuildingEditMocks,
} from "./fixtures/admin-building-edits"

test.describe("Admin building edits smoke", () => {
  test.describe.configure({ mode: "serial" })
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await installAdminBuildingEditMocks(page)
    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { name: "Review center" }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "Building edits" }).click()
    await expect(
      page.getByRole("heading", {
        name: "Building edits",
        level: 2,
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: adminBuildingEditDiffTitle }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("shows the current and proposed building diff", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: adminBuildingEditDiffTitle }),
    ).toBeVisible()
    await expect(page.getByText("Current building")).toBeVisible()
    await expect(page.getByText("Proposed building")).toBeVisible()
    await expect(
      page.getByText(adminBuildingEditOriginalName, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(adminBuildingEditProposedName, { exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Changed").first()).toBeVisible()
    await expect(
      page
        .getByRole("article")
        .getByText(
          "Correct building name and facilities after on-site visit.",
        ),
    ).toBeVisible()
  })

  test("approves a building edit from the review dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Approve edit" }).click()
    await expect(
      page.getByRole("heading", { name: "Approve building edit" }),
    ).toBeVisible()

    const approveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/admin\/building-edit-requests\/[^/]+\/approve$/.test(response.url()) &&
        response.ok(),
    )

    await page.getByRole("dialog").getByRole("button", { name: "Approve edit" }).click()
    await approveResponse

    await expect(page.getByText("No building edit requests")).toBeVisible({
      timeout: 15_000,
    })
  })

  test("rejects a building edit from the review dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Reject", exact: true }).click()
    await expect(
      page.getByRole("heading", { name: "Reject building edit" }),
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Building name looks incorrect" })
      .click()

    const rejectResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/admin\/building-edit-requests\/[^/]+\/reject$/.test(response.url()) &&
        response.ok(),
    )

    await page.getByRole("dialog").getByRole("button", { name: "Reject edit" }).click()
    await rejectResponse

    await expect(page.getByText("No building edit requests")).toBeVisible({
      timeout: 15_000,
    })
  })
})
