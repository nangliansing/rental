import { expect, test } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAgentProfile,
  waitForAuthenticatedProfile,
} from "./fixtures/authenticated-session"

test.describe("Signed-in smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthenticatedSessionMocks(page)
  })

  test("loads the profile dashboard with tabs and saved nav affordance", async ({
    page,
  }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    await expect(page.getByRole("tab", { name: "Listings" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Requests" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Saved" })).toHaveCount(0)
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Saved listings" }),
    ).toBeVisible()
  })

  test("filters profile listings by availability tabs", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    const listingFilters = page.getByRole("tablist", { name: "Listing filters" })

    await expect(page.getByRole("button", { name: "Open listing ฿14k" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Open listing ฿15k" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Open listing ฿17k" })).toBeVisible()

    await listingFilters.getByRole("tab", { name: "Now" }).click()
    await expect(page.getByRole("button", { name: "Open listing ฿15k" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Open listing ฿14k" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Open listing ฿16k" })).toHaveCount(0)

    await listingFilters.getByRole("tab", { name: "Soon" }).click()
    await expect(page.getByText("Soonest first")).toBeVisible()
    await expect(page.locator("#my-profile-listing-sort")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Open listing ฿16k" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Open listing ฿16.5k" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Open listing ฿15k" })).toHaveCount(0)

    await listingFilters.getByRole("tab", { name: "All" }).click()
    const sortSelect = page.locator("#my-profile-listing-sort")
    await expect(sortSelect).toBeVisible()
    await expect(sortSelect).toHaveValue("latest")

    await listingFilters.getByRole("tab", { name: "Private" }).click()
    await expect(page.getByRole("button", { name: "Open listing ฿17k" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Open listing ฿16k" })).toHaveCount(0)
  })

  test("loads the profile Requests tab workspace", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)
    await page.getByRole("tab", { name: "Requests" }).click()

    await expect(
      page.getByRole("region", { name: "Client requests" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Client requests" }),
    ).toBeVisible()
    await expect(page.getByText("No waiting requests")).toBeVisible()
  })

  test("opens the nav saved drawer while signed in", async ({ page }) => {
    await page.goto("/profile")

    await waitForAuthenticatedProfile(page)

    const [savedButton] = await page
      .getByRole("button", { name: "Saved listings" })
      .all()
    await savedButton.click()

    await expect(page.getByRole("heading", { name: "Saved" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Open saved listing ฿14k" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Close saved listings" }).click()

    await expect(page.getByRole("heading", { name: "Saved" })).toHaveCount(0)
  })

  test("loads profile edit with the standalone header", async ({ page }) => {
    await page.goto("/profile/edit")

    await expect(page.getByRole("button", { name: "Go back" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Search rentals" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Go to profile" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Edit contact profile" }),
    ).toBeVisible()
    await expect(
      page.getByLabel("Display name", { exact: false }),
    ).toHaveValue(smokeAgentProfile.displayName)
  })

  test("returns create listing from step 2 to step 1 via the shared back button", async ({
    page,
  }) => {
    await page.goto("/listings/new?lat=13.70000&lng=100.50000")

    await expect(
      page.getByRole("heading", { name: "Building details", level: 1 }),
    ).toBeVisible()

    await page.getByLabel("Building name", { exact: false }).fill("Smoke Draft Residence")
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(
      page.getByRole("heading", { name: "Room details", level: 1 }),
    ).toBeVisible()
    await expect(page.getByText("Step 2 of 2")).toBeVisible()

    await page.getByRole("button", { name: "Go back" }).click()

    await expect(
      page.getByRole("heading", { name: "Building details", level: 1 }),
    ).toBeVisible()
    await expect(page.getByText("Step 1 of 2")).toBeVisible()
    await expect(
      page.getByLabel("Building name", { exact: false }),
    ).toHaveValue("Smoke Draft Residence")
  })
})
