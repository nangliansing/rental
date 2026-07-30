import { expect, test, type Page } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAgentProfile,
  waitForAuthenticatedProfile,
} from "./fixtures/authenticated-session"
import { smokeListingBuilding } from "./fixtures/lister-onboarding"

const HEADER_STAT_TIMEOUT = 15_000

async function expectStableProfileHeaderStats(page: Page) {
  const displayName = page.getByRole("heading", { level: 1 })

  await expect(displayName).toHaveText(smokeAgentProfile.displayName, {
    timeout: HEADER_STAT_TIMEOUT,
  })
  await expect(page.getByTestId("profile-stat-listings")).toHaveText(
    `${smokeAgentProfile.listingSummary.activeCount} Listings`,
    { timeout: HEADER_STAT_TIMEOUT },
  )
  await expect(page.getByTestId("profile-stat-reviews")).toHaveText(
    `${smokeAgentProfile.reviewSummary.reviewCount} Reviews`,
    { timeout: HEADER_STAT_TIMEOUT },
  )
}

test.describe("Profile dashboard smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedSessionMocks(page)
  })

  test("saves profile edits and returns to the dashboard", async ({ page }) => {
    const updatedName = "Smoke Updated Lister"

    await page.goto("/profile/edit")

    await expect(
      page.getByRole("heading", { name: "Edit contact profile", level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    await page.getByLabel("Display name", { exact: false }).fill(updatedName)
    await page.getByRole("button", { name: "Save changes" }).click()

    await expect(page).toHaveURL("/profile")
    await expect(
      page.getByRole("heading", { name: updatedName, level: 1 }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("loads listings, saved, and reviews tabs", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    await expect(
      page.getByRole("button", { name: "Open listing ฿14k" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Open listing ฿14k" }).click()
    await expect(
      page.getByRole("dialog", { name: "Preview listing ฿14k" }),
    ).toBeVisible({ timeout: 15_000 })
    await page
      .getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      })
      .click()
    await expect(
      page.getByRole("dialog", { name: "Listing details" }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "Close listing details" }).click()
    await expect(
      page.getByRole("dialog", { name: "Listing details" }),
    ).toHaveCount(0, { timeout: 15_000 })

    await page.getByRole("tab", { name: "Saved" }).click()
    await expect(
      page.getByRole("button", { name: "Open saved listing ฿14k" }),
    ).toBeVisible()

    await page.getByRole("tab", { name: "Reviews" }).click()
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible()
    await expect(page.getByText("No reviews yet.")).toBeVisible()
  })

  test.describe("with a pending submission", () => {
    test.beforeEach(async ({ page }) => {
      await installAuthenticatedSessionMocks(page, { withPendingPost: true })
    })

    test("opens pending detail and cancels delete", async ({ page }) => {
      await page.goto("/profile")

      await waitForAuthenticatedProfile(page)
      await page.getByRole("tab", { name: "Pending" }).click()

      await expect(
        page.getByRole("button", {
          name: `Open pending submission ${smokeListingBuilding.name}`,
        }),
      ).toBeVisible({ timeout: 15_000 })

      await page
        .getByRole("button", {
          name: `Open pending submission ${smokeListingBuilding.name}`,
        })
        .click()

      await expect(
        page.getByRole("heading", {
          name: smokeListingBuilding.name,
          level: 2,
        }),
      ).toBeVisible()

      await page.getByRole("button", { name: "Open submission actions" }).click()
      await page.getByRole("button", { name: "Delete" }).click()
      await expect(page.getByText("Delete this submission?")).toBeVisible()
      await page.getByRole("button", { name: "Cancel" }).click()

      await expect(page.getByText("Delete this submission?")).toHaveCount(0)
      await expect(
        page.getByRole("button", {
          name: `Open pending submission ${smokeListingBuilding.name}`,
        }),
      ).toBeVisible()
    })
  })

  test("keeps header stats stable while switching tabs", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)
    await expectStableProfileHeaderStats(page)

    for (const tabName of ["Pending", "Saved", "Reviews", "Listings"] as const) {
      await page.getByRole("tab", { name: tabName }).click()
      await expectStableProfileHeaderStats(page)
    }
  })

  test("copies the profile share link", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    await page.getByRole("button", { name: "Share profile" }).click()
    await expect(page.getByRole("heading", { name: "Share profile" })).toBeVisible()

    await page.getByRole("button", { name: "Copy link" }).click()
    await expect(page.getByRole("button", { name: "Copied link" })).toBeVisible()
  })

  test("copies a contact chip", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    await page.getByRole("button", { name: "Phone" }).click()
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible()
  })

  test("redirects signed-in users from login back to profile", async ({ page }) => {
    await page.goto("/login?redirect=/profile")

    await waitForAuthenticatedProfile(page)
    await expect(page).toHaveURL("/profile")
  })

  test("logs out from settings and returns to the signed-out gate", async ({
    page,
  }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    await page.getByRole("button", { name: "Profile settings" }).click()
    await expect(page.getByRole("heading", { name: "Profile settings" })).toBeVisible()
    await page.getByRole("button", { name: "Log out" }).click()
    await expect(page.getByRole("heading", { name: "Log out?" })).toBeVisible()
    await page.getByRole("button", { name: "Log out", exact: true }).click()

    await expect(
      page.getByRole("heading", { name: "Continue to your profile" }),
    ).toBeVisible({ timeout: 15_000 })
  })
})
