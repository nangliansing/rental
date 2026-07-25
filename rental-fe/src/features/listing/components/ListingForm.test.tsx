import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { UploadedMedia } from "../../uploads/api/uploadToCloudinary"
import { ListingForm } from "./ListingForm"

const listingPhoto: UploadedMedia = {
  publicId: "listing/photo",
  secureUrl: "https://example.com/photo.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120_000,
  position: 0,
  alt: "Room",
  isCover: true,
}

const originalPhoto: UploadedMedia = {
  ...listingPhoto,
  publicId: "listing/original-photo",
  secureUrl: "https://example.com/original-photo.jpg",
}

type UploadState = {
  isUploading: boolean
  hasFailedUpload: boolean
  media: UploadedMedia[]
}

vi.mock("../../uploads/components/MediaUploader", () => ({
  MediaUploader: ({
    disabled,
    onUploadStateChange,
  }: {
    disabled?: boolean
    onUploadStateChange?: (state: UploadState) => void
  }) => (
    <div data-testid="media-uploader" data-disabled={disabled || undefined}>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: false,
            hasFailedUpload: false,
            media: [listingPhoto],
          })
        }
      >
        Add listing photo
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: true,
            hasFailedUpload: false,
            media: [listingPhoto],
          })
        }
      >
        Start photo upload
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: false,
            hasFailedUpload: true,
            media: [listingPhoto],
          })
        }
      >
        Fail photo upload
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: false,
            hasFailedUpload: false,
            media: [listingPhoto],
          })
        }
      >
        Finish photo upload
      </button>
    </div>
  ),
}))

describe("ListingForm", () => {
  it("submits normalized create values through accessible shared controls", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ListingForm onSubmit={onSubmit} />)

    const visibility = screen.getByRole("combobox", { name: "Visibility" })
    const rent = screen.getByRole("spinbutton", { name: "Rent" })
    const facilities = screen.getByRole("group", { name: "Facilities" })
    const rules = screen.getByRole("group", { name: "Rules and documents" })
    const submit = screen.getByRole("button", { name: "Continue" })

    expect(visibility).toBeRequired()
    expect(rent).toBeRequired()
    expect(facilities).toBeInTheDocument()
    expect(rules).toBeInTheDocument()
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Add listing photo" }))
    await user.selectOptions(visibility, "PRIVATE")
    await user.clear(rent)
    await user.type(rent, "12000")
    await user.click(screen.getByRole("button", { name: "Foreigner accepted" }))
    await user.click(screen.getByRole("button", { name: "Wi-Fi" }))
    await user.type(
      screen.getByRole("textbox", { name: "Description" }),
      "  Quiet room near transit  ",
    )
    await user.click(submit)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: "PRIVATE",
        rent: 12000,
        isForeignerAccepted: true,
        facilities: ["Wifi"],
        media: [listingPhoto],
        description: "Quiet room near transit",
      }),
    )
  })

  it("submits only changed fields in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ListingForm
        mode="edit"
        defaultValues={{ rent: 12000, media: [listingPhoto] }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()

    const rent = screen.getByRole("spinbutton", { name: "Rent" })
    await user.clear(rent)
    await user.type(rent, "13000")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rent: 13000 }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled(),
    )
  })

  it("builds a complete patch when every editable field changes", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ListingForm
        mode="edit"
        defaultValues={{
          visibility: "PUBLIC",
          isForeignerAccepted: false,
          isTM30Provided: false,
          rent: 10000,
          deposit: 20000,
          moveInCost: 30000,
          electricRate: null,
          waterRate: null,
          bedroomCount: 0,
          bathroomCount: 1,
          kitchenType: "No Kitchen",
          size: null,
          contractMonths: 3,
          occupancy: 1,
          isCookingAllowed: false,
          isPetAllowed: false,
          facilities: [],
          media: [originalPhoto],
          description: "Original description",
        }}
        onSubmit={onSubmit}
      />,
    )

    const replaceNumber = async (name: string, value: string) => {
      const input = screen.getByRole("spinbutton", { name })
      await user.clear(input)
      await user.type(input, value)
    }

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Visibility" }),
      "PRIVATE",
    )
    await replaceNumber("Rent", "11000")
    await replaceNumber("Deposit", "21000")
    await replaceNumber("Move-in cost", "32000")
    await replaceNumber("Electric rate", "8")
    await replaceNumber("Water rate", "20")
    await replaceNumber("Size", "35")
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Bedrooms" }),
      "1",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Bathrooms" }),
      "2",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Kitchen" }),
      "Kitchen",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Minimum contract" }),
      "6",
    )
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Occupancy" }),
      "2",
    )

    for (const name of [
      "Foreigner accepted",
      "TM30 provided",
      "Cooking allowed",
      "Pets allowed",
      "Wi-Fi",
      "Add listing photo",
    ]) {
      await user.click(screen.getByRole("button", { name }))
    }

    const description = screen.getByRole("textbox", { name: "Description" })
    await user.clear(description)
    await user.type(description, "Updated description")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        visibility: "PRIVATE",
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 11000,
        deposit: 21000,
        moveInCost: 32000,
        electricRate: 8,
        waterRate: 20,
        bedroomCount: 1,
        bathroomCount: 2,
        kitchenType: "Kitchen",
        size: 35,
        contractMonths: 6,
        occupancy: 2,
        isCookingAllowed: true,
        isPetAllowed: true,
        facilities: ["Wifi"],
        media: [listingPhoto],
        description: "Updated description",
      }),
    )
  })

  it("blocks submission during uploads and reports failed uploads", async () => {
    const user = userEvent.setup()

    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    await user.click(screen.getByRole("button", { name: "Start photo upload" }))
    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Fail photo upload" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Remove or retry failed photos first.",
    )
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Finish photo upload" }))
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
  })

  it("shows submission errors and handles missing arrays defensively", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error("Listing could not be saved"))

    render(
      <ListingForm
        defaultValues={{ facilities: undefined, media: undefined }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("group", { name: "Facilities" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add listing photo" }))
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Listing could not be saved",
    )
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
  })
})
