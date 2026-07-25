import { expect, test } from "@playwright/test"

import { installAuthenticatedSessionMocks } from "./fixtures/authenticated-session"

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

    await page.getByLabel("Display name", { exact: false }).fill("Smoke New Lister")
    await page.getByRole("button", { name: "English", exact: true }).click()
    await page.getByLabel("Phone", { exact: false }).fill("0812345678")
    await page.getByRole("button", { name: "Create profile" }).click()

    await expect(
      page.getByRole("heading", { name: "Smoke New Lister", level: 1 }),
    ).toBeVisible({ timeout: 15_000 })
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

    await page.getByLabel("Display name", { exact: false }).fill("Smoke New Lister")
    await page.getByRole("button", { name: "English", exact: true }).click()
    await page.getByLabel("Phone", { exact: false }).fill("0812345678")
    await page.getByRole("button", { name: "Create profile" }).click()

    await expect(
      page.getByRole("heading", { name: "Smoke New Lister", level: 1 }),
    ).toBeVisible({ timeout: 15_000 })

    await page.getByRole("tab", { name: "Pending" }).click()

    await expect(
      page.getByRole("heading", { name: "No submissions yet" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("link", { name: "Submit your first listing" }),
    ).toHaveAttribute("href", "/?purpose=list")
  })
})
