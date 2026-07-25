import type { Page } from "@playwright/test"

export const smokeListingBuilding = {
  _id: "building-smoke-1",
  name: "Bangkapi Residence",
  buildingType: "Apartment",
  facilities: ["Parking"],
  security: ["CCTV"],
  location: {
    type: "Point",
    coordinates: [100.6435, 13.7654],
  },
  address: "Bang Kapi, Bangkok",
  minRent: 14000,
  maxRent: 16000,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

export async function installUploadMocks(page: Page) {
  await page.route("**/api/v1/uploads/signature", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          uploadSignature: {
            purpose: "listing-photo",
            uploadSignatures: [
              {
                cloudName: "smoke-cloud",
                apiKey: "smoke-api-key",
                timestamp: 1_700_000_000,
                folder: "listings",
                publicId: "listings/smoke-room-photo",
                signature: "smoke-signature",
              },
            ],
          },
        },
      }),
    })
  })

  await page.route("https://api.cloudinary.com/v1_1/**/image/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: "https://example.com/smoke-room.jpg",
        public_id: "listings/smoke-room-photo",
        resource_type: "image",
        format: "jpg",
        width: 800,
        height: 600,
        bytes: 120_000,
      }),
    })
  })
}

export async function createSmokeContactProfile(
  page: Page,
  displayName = "Smoke New Lister",
) {
  await page.getByLabel("Display name", { exact: false }).fill(displayName)
  await page.getByRole("button", { name: "English", exact: true }).click()
  await page.getByLabel("Phone", { exact: false }).fill("0812345678")
  await page.getByRole("button", { name: "Create profile" }).click()

  await page
    .getByRole("heading", { name: displayName, level: 1 })
    .waitFor({ timeout: 15_000 })
}

export async function fillMinimalListingForSubmit(page: Page) {
  await page.getByRole("spinbutton", { name: "Rent" }).fill("14000")

  await page.locator('input[type="file"]').setInputFiles({
    name: "smoke-room.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("smoke-listing-photo"),
  })

  await page.getByRole("button", { name: "Remove smoke-room.jpg" }).waitFor({
    timeout: 15_000,
  })
}
