import { expect, test } from "@playwright/test"

import {
  installUploadMocks,
  fillMinimalListingForSubmit,
  smokeListingBuilding,
} from "./fixtures/lister-onboarding"
import {
  fillPrivateNoteField,
  installAnonymousListingPrivateNoteMocks,
  installListingPrivateNoteSessionMocks,
  smokePrivateNoteListingId,
  smokePrivateNoteText,
  smokePrivateNoteUpdatedText,
  waitForAuthenticatedProfile,
} from "./fixtures/listing-private-note-session"

test.describe("Listing private note smoke", () => {
  test.describe.configure({ mode: "serial" })

  test.describe("listing detail", () => {
    test("shows the owner-only private note to the listing owner", async ({
      page,
    }) => {
      await installListingPrivateNoteSessionMocks(page)
      await page.goto(`/listings/${smokePrivateNoteListingId}`)

      await expect(page.getByLabel("Private note")).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByText(smokePrivateNoteText)).toBeVisible()
      await expect(page.getByText("Only visible to you")).toBeVisible()
    })

    test("hides the private note from anonymous viewers", async ({ page }) => {
      await installAnonymousListingPrivateNoteMocks(page)
      await page.goto(`/listings/${smokePrivateNoteListingId}`)

      await expect(page.getByText("Flexible public room")).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByLabel("Private note")).toHaveCount(0)
      await expect(page.getByText(smokePrivateNoteText)).toHaveCount(0)
      await expect(page.getByText("Only visible to you")).toHaveCount(0)
    })
  })

  test.describe("create form", () => {
    test("shows the private note field with owner-only helper copy", async ({
      page,
    }) => {
      await installListingPrivateNoteSessionMocks(page)
      await installUploadMocks(page)
      await page.goto(
        `/listings/new?buildingId=${smokeListingBuilding._id}`,
      )

      await expect(
        page.getByRole("heading", { name: "Private note" }),
      ).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/Only visible to you/)).toBeVisible()
      await expect(
        page.getByRole("textbox", { name: "Private note" }),
      ).toHaveAttribute("maxLength", "3000")
    })

    test("submits privateNote when creating a pending listing", async ({
      page,
    }) => {
      await installListingPrivateNoteSessionMocks(page)
      await installUploadMocks(page)
      await page.goto(
        `/listings/new?buildingId=${smokeListingBuilding._id}`,
      )

      await fillMinimalListingForSubmit(page)
      await fillPrivateNoteField(page, "Gate code 9999")

      const pendingPostRequest = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          request.url().includes("/api/v1/pending-posts"),
      )

      await page.getByRole("button", { name: "Submit for review" }).click()

      const request = await pendingPostRequest
      const body = request.postDataJSON() as {
        listing?: { privateNote?: string }
      }

      expect(body.listing?.privateNote).toBe("Gate code 9999")
      await expect(
        page.getByRole("heading", { name: "Submitted for review", level: 1 }),
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("edit form", () => {
    test.beforeEach(async ({ page }) => {
      await installListingPrivateNoteSessionMocks(page)
    })

    test("prefills privateNote on the edit form", async ({ page }) => {
      await page.goto(`/listings/${smokePrivateNoteListingId}/edit`)

      await expect(
        page.getByRole("heading", { name: "Edit listing", level: 1 }),
      ).toBeVisible({ timeout: 15_000 })
      await expect(
        page.getByRole("textbox", { name: "Private note" }),
      ).toHaveValue(smokePrivateNoteText)
    })

    test("updates privateNote and reflects the change on listing detail", async ({
      page,
    }) => {
      await page.goto(`/listings/${smokePrivateNoteListingId}/edit`)

      await expect(
        page.getByRole("textbox", { name: "Private note" }),
      ).toHaveValue(smokePrivateNoteText, { timeout: 15_000 })

      await fillPrivateNoteField(page, smokePrivateNoteUpdatedText)
      await page.getByRole("button", { name: "Save changes" }).click()

      await expect(
        page.getByRole("button", { name: "No changes" }),
      ).toBeDisabled({ timeout: 15_000 })

      await page.goto(`/listings/${smokePrivateNoteListingId}`)

      await expect(page.getByLabel("Private note")).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByText(smokePrivateNoteUpdatedText)).toBeVisible()
      await expect(page.getByText(smokePrivateNoteText)).toHaveCount(0)
    })

    test("clears privateNote and hides it from listing detail", async ({
      page,
    }) => {
      await page.goto(`/listings/${smokePrivateNoteListingId}/edit`)

      await expect(
        page.getByRole("textbox", { name: "Private note" }),
      ).toHaveValue(smokePrivateNoteText, { timeout: 15_000 })

      await page.getByRole("textbox", { name: "Private note" }).clear()
      await page.getByRole("button", { name: "Save changes" }).click()

      await expect(
        page.getByRole("button", { name: "No changes" }),
      ).toBeDisabled({ timeout: 15_000 })

      await page.goto(`/listings/${smokePrivateNoteListingId}`)

      await expect(page.getByText("Flexible public room")).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByLabel("Private note")).toHaveCount(0)
      await expect(page.getByText(smokePrivateNoteText)).toHaveCount(0)
    })
  })

  test.describe("profile preview", () => {
    test("does not expose private note in the profile listing preview dialog", async ({
      page,
    }) => {
      await installListingPrivateNoteSessionMocks(page)
      await page.goto("/profile")

      await waitForAuthenticatedProfile(page)
      await page.getByRole("button", { name: "Open listing ฿14k" }).click()

      await expect(
        page.getByRole("dialog", { name: "Preview listing ฿14k" }),
      ).toBeVisible({ timeout: 15_000 })
      await expect(page.getByLabel("Private note")).toHaveCount(0)
      await expect(page.getByText(smokePrivateNoteText)).toHaveCount(0)
    })
  })
})
