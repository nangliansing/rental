import { render, screen, waitFor, within } from "@testing-library/react"
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

    const visibility = screen.getByRole("button", { name: "Visibility" })
    const rent = screen.getByRole("spinbutton", { name: "Rent" })
    const facilities = screen.getByRole("group", { name: "Facilities" })
    const rules = screen.getByRole("group", { name: "Rules" })
    const submit = screen.getByRole("button", { name: "Continue" })

    expect(visibility).toHaveAttribute("aria-required", "true")
    expect(rent).toBeRequired()
    expect(facilities).toBeInTheDocument()
    expect(rules).toBeInTheDocument()
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Add listing photo" }))
    await user.click(visibility)
    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))
    await user.clear(rent)
    await user.type(rent, "12000")
    await user.click(screen.getByRole("button", { name: "Foreigner accepted" }))
    await user.click(screen.getByRole("button", { name: "Wi-Fi" }))
    await user.type(
      screen.getByRole("textbox", { name: "Description" }),
      "  Quiet room near transit  ",
    )
    await user.type(
      screen.getByRole("textbox", { name: "Private note" }),
      "  Gate code 4321  ",
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
        privateNote: "Gate code 4321",
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
          privateNote: "Original private note",
        }}
        onSubmit={onSubmit}
      />,
    )

    const replaceNumber = async (name: string, value: string) => {
      const input = screen.getByRole("spinbutton", { name })
      await user.clear(input)
      await user.type(input, value)
    }

    await user.click(screen.getByRole("button", { name: "Visibility" }))
    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))
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
    await user.click(screen.getByRole("button", { name: "Minimum contract" }))
    await user.click(screen.getByRole("radio", { name: /6 months/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))
    await user.click(screen.getByRole("button", { name: "2 people" }))

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
    const privateNote = screen.getByRole("textbox", { name: "Private note" })
    await user.clear(privateNote)
    await user.type(privateNote, "Updated private note")
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
        privateNote: "Updated private note",
      }),
    )
  })

  it("submits availableAt when availability changes in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ListingForm
        mode="edit"
        defaultValues={{
          rent: 12000,
          media: [listingPhoto],
          availabilityMode: "flexible",
          availableFromDate: "",
        }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Availability" }))
    const dialog = screen.getByRole("dialog", {
      name: "When is the room available?",
    })
    await user.click(
      within(dialog).getByRole("button", { name: "Available now" }),
    )
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          availableAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      ),
    )
  })

  it("submits null availableAt when switching to Flexible in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ListingForm
        mode="edit"
        defaultValues={{
          rent: 12000,
          media: [listingPhoto],
          availabilityMode: "from_date",
          availableFromDate: "2026-08-15",
        }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Availability" }))
    const dialog = screen.getByRole("dialog", {
      name: "When is the room available?",
    })
    await user.click(within(dialog).getByRole("button", { name: "Flexible" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ availableAt: null }),
    )
  })

  it("shows an availability error for invalid from-date defaults", () => {
    render(
      <ListingForm
        mode="edit"
        defaultValues={{
          rent: 12000,
          media: [listingPhoto],
          availabilityMode: "from_date",
          availableFromDate: "not-a-date",
        }}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an available-from date",
    )
    expect(screen.getByRole("button", { name: "Availability" })).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("clears the availability error after a valid mode is chosen", async () => {
    const user = userEvent.setup()

    render(
      <ListingForm
        mode="edit"
        defaultValues={{
          rent: 12000,
          media: [listingPhoto],
          availabilityMode: "from_date",
          availableFromDate: "not-a-date",
        }}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an available-from date",
    )

    await user.click(screen.getByRole("button", { name: "Availability" }))
    const dialog = screen.getByRole("dialog", {
      name: "When is the room available?",
    })
    await user.click(
      within(dialog).getByRole("button", { name: "Available now" }),
    )

    expect(
      screen.queryByText("Choose an available-from date"),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Availability" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })

  it("wires the visibility, availability, and contract tabs without loading spinners", () => {
    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    const tabRow = screen.getByRole("group", {
      name: "Visibility, availability, and contract",
    })

    expect(
      within(tabRow).getByRole("button", { name: "Visibility" }),
    ).toHaveAttribute("aria-required", "true")
    expect(
      within(tabRow).getByRole("button", { name: "Availability" }),
    ).toHaveAttribute("aria-required", "true")
    expect(
      within(tabRow).getByRole("button", { name: "Minimum contract" }),
    ).toHaveAttribute("aria-required", "true")

    for (const name of ["Visibility", "Availability", "Minimum contract"]) {
      expect(
        within(tabRow).getByRole("button", { name }),
      ).not.toHaveAttribute("aria-busy", "true")
    }
  })

  it("labels Private note from the section heading with owner-only helper copy", () => {
    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    const heading = screen.getByRole("heading", { name: "Private note" })
    const privateNote = screen.getByRole("textbox", { name: "Private note" })

    expect(heading).toBeInTheDocument()
    expect(privateNote).toHaveAttribute(
      "aria-labelledby",
      heading.getAttribute("id") ?? undefined,
    )
    expect(screen.getByText(/Only visible to you/)).toBeInTheDocument()
    expect(privateNote).toHaveAttribute("maxLength", "3000")
  })

  it("submits null privateNote when clearing an existing note in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ListingForm
        mode="edit"
        defaultValues={{
          rent: 12000,
          media: [listingPhoto],
          privateNote: "Gate code 1234",
        }}
        onSubmit={onSubmit}
      />,
    )

    const privateNote = screen.getByRole("textbox", { name: "Private note" })
    await user.clear(privateNote)
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ privateNote: "" }),
    )
  })

  describe("privateNote", () => {
    it("defaults privateNote to empty on create", () => {
      render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

      expect(screen.getByRole("textbox", { name: "Private note" })).toHaveValue(
        "",
      )
    })

    it("submits an empty privateNote when the field is left untouched on create", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(<ListingForm onSubmit={onSubmit} />)

      await user.click(screen.getByRole("button", { name: "Add listing photo" }))
      await user.click(screen.getByRole("button", { name: "Continue" }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ privateNote: "" }),
        ),
      )
    })

    it("normalizes whitespace-only private notes to empty on create", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(<ListingForm onSubmit={onSubmit} />)

      await user.click(screen.getByRole("button", { name: "Add listing photo" }))
      await user.type(
        screen.getByRole("textbox", { name: "Private note" }),
        "     ",
      )
      await user.click(screen.getByRole("button", { name: "Continue" }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ privateNote: "" }),
        ),
      )
    })

    it("prefills privateNote in edit mode from defaultValues", () => {
      render(
        <ListingForm
          mode="edit"
          defaultValues={{
            rent: 12000,
            media: [listingPhoto],
            privateNote: "Existing owner note",
          }}
        />,
      )

      expect(screen.getByRole("textbox", { name: "Private note" })).toHaveValue(
        "Existing owner note",
      )
    })

    it("omits privateNote from edit patches when it did not change", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <ListingForm
          mode="edit"
          defaultValues={{
            rent: 12000,
            media: [listingPhoto],
            privateNote: "Existing owner note",
          }}
          onSubmit={onSubmit}
        />,
      )

      const rent = screen.getByRole("spinbutton", { name: "Rent" })
      await user.clear(rent)
      await user.type(rent, "13000")
      await user.click(screen.getByRole("button", { name: "Save changes" }))

      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rent: 13000 }))
      expect(onSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ privateNote: expect.anything() }),
      )
    })

    it("submits only privateNote when it is the sole changed field in edit mode", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <ListingForm
          mode="edit"
          defaultValues={{
            rent: 12000,
            media: [listingPhoto],
            privateNote: "",
          }}
          onSubmit={onSubmit}
        />,
      )

      await user.type(
        screen.getByRole("textbox", { name: "Private note" }),
        "New owner note",
      )
      await user.click(screen.getByRole("button", { name: "Save changes" }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({ privateNote: "New owner note" }),
      )
    })

    it("treats whitespace-only retypes as unchanged after normalization in edit mode", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <ListingForm
          mode="edit"
          defaultValues={{
            rent: 12000,
            media: [listingPhoto],
            privateNote: "",
          }}
          onSubmit={onSubmit}
        />,
      )

      await user.type(
        screen.getByRole("textbox", { name: "Private note" }),
        "   ",
      )

      expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("keeps description and privateNote changes independent in edit mode", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(
        <ListingForm
          mode="edit"
          defaultValues={{
            rent: 12000,
            media: [listingPhoto],
            description: "Public description",
            privateNote: "Owner note",
          }}
          onSubmit={onSubmit}
        />,
      )

      const description = screen.getByRole("textbox", { name: "Description" })
      await user.clear(description)
      await user.type(description, "Updated public description")
      await user.click(screen.getByRole("button", { name: "Save changes" }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          description: "Updated public description",
        }),
      )
      expect(onSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ privateNote: expect.anything() }),
      )
    })
  })

  it("labels Description from the section heading without a duplicate field label", () => {
    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    const heading = screen.getByRole("heading", { name: "Description" })
    const description = screen.getByRole("textbox", { name: "Description" })

    expect(heading).toBeInTheDocument()
    expect(description).toHaveAttribute(
      "aria-labelledby",
      heading.getAttribute("id") ?? undefined,
    )
    expect(description).toHaveClass(
      "border-0",
      "p-0",
      "text-sm",
      "leading-5",
      "text-slate-700",
      "whitespace-pre-wrap",
    )
    expect(screen.queryByText("About the room")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("label", { name: "Description" }),
    ).not.toBeInTheDocument()
  })

  it("keeps occupancy under Rules and documents", () => {
    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    expect(
      screen.getByRole("heading", { name: "Rules and documents" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Occupancy" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Rules" })).toBeInTheDocument()
  })

  it("uses white bordered inputs for price fields", () => {
    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    expect(screen.getByRole("spinbutton", { name: "Rent" })).toHaveClass(
      "bg-white",
      "border-slate-200",
    )
    expect(screen.getByRole("combobox", { name: "Bedrooms" })).toHaveClass(
      "bg-white",
      "border-slate-200",
    )
  })

  it("defaults new listings to Available now", () => {
    render(<ListingForm defaultValues={{ media: [listingPhoto] }} />)

    expect(screen.getByRole("button", { name: "Availability" })).toHaveTextContent(
      "Available now",
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
