import { expect, test } from "@playwright/test"

import { installNotificationsSessionMocks } from "./fixtures/notifications-session"

test.describe("Notifications smoke", () => {
  test("hides the bell badge for signed-out users on the profile gate", async ({
    page,
  }) => {
    await page.goto("/profile")

    await expect(
      page.getByRole("heading", { name: "Continue to your profile" }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("button", { name: "Notifications" })).toHaveCount(
      0,
    )
  })

  test("opens an empty notifications panel for signed-in users", async ({
    page,
  }) => {
    await installNotificationsSessionMocks(page)
    await page.goto("/profile")

    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "Notifications" })
      .click()

    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible()
    await expect(page.getByText("No notifications yet")).toBeVisible()
  })

  test("shows unread notifications and clears the badge after opening the panel", async ({
    page,
  }) => {
    await installNotificationsSessionMocks(page, { withUnreadNotification: true })
    await page.goto("/profile")

    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" })

    await expect(
      mobileNav.getByRole("button", { name: "1 unread notifications" }),
    ).toBeVisible({ timeout: 15_000 })

    await mobileNav.getByRole("button", { name: "1 unread notifications" }).click()

    await expect(
      page.getByText("Bangkapi Residence is now ฿13k/month."),
    ).toBeVisible()
    await expect(
      mobileNav.getByRole("button", { name: "Notifications", exact: true }),
    ).toBeVisible({ timeout: 15_000 })
  })
})
