import { expect, test } from "@playwright/test"

import { installAuthenticatedSessionMocks } from "./fixtures/authenticated-session"
import {
  createSmokeContactProfile,
  fillMinimalListingForSubmit,
  installUploadMocks,
  smokeListingBuilding,
} from "./fixtures/lister-onboarding"

test.describe("Lister onboarding smoke", () => {
  test.describe.configure({ mode: "serial" })

  test("creates a contact profile and shows first-listing guidance", async ({
    page,
  }) => {
    await installAuthenticatedSessionMocks(page, { hasAgentProfile: false })
    await page.goto("/profile")

    await expect(
      page.getByRole("heading", { name: "Contact profile", level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    await createSmokeContactProfile(page)

    await expect(
      page.getByRole("heading", { name: "List your first room" }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Start listing" }).first(),
    ).toHaveAttribute("href", "/?purpose=list")
  })

  test("shows a start-listing action on the empty pending tab", async ({
    page,
  }) => {
    await installAuthenticatedSessionMocks(page, { hasAgentProfile: false })
    await page.goto("/profile")

    await createSmokeContactProfile(page)

    await page.getByRole("tab", { name: "Pending" }).click()

    await expect(
      page.getByRole("heading", { name: "No submissions yet" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("link", { name: "Submit your first listing" }),
    ).toHaveAttribute("href", "/?purpose=list")
  })

  test("submits a listing and shows it on the pending tab", async ({ page }) => {
    await installAuthenticatedSessionMocks(page, { hasAgentProfile: false })
    await installUploadMocks(page)
    await page.goto("/profile")

    await createSmokeContactProfile(page)

    await page.goto(
      `/listings/new?buildingId=${smokeListingBuilding._id}`,
    )

    await expect(
      page.getByRole("heading", {
        name: smokeListingBuilding.name,
        level: 2,
      }),
    ).toBeVisible({ timeout: 15_000 })

    await fillMinimalListingForSubmit(page)
    await page.getByRole("button", { name: "Submit for review" }).click()

    await expect(
      page.getByRole("heading", { name: "Submitted for review", level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    await page.locator("main").getByRole("link", { name: "Go to profile" }).click()

    await page.getByRole("tab", { name: "Pending" }).click()

    await expect(
      page.getByRole("button", {
        name: `Open pending submission ${smokeListingBuilding.name}`,
      }),
    ).toBeVisible({ timeout: 15_000 })
  })
})
