import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ProfileAvatar,
  ProfileDetails,
  ProfileIdentity,
  ProfileStatList,
} from "./ProfileOverviewPrimitives"

describe("ProfileAvatar", () => {
  it("renders normalized image content and an accessible active status", () => {
    render(
      <ProfileAvatar
        displayName=" Nang Rentals "
        photo={{ secureUrl: " https://example.com/profile.jpg ", alt: " " }}
        isActive
        statusLabel=" Online lister "
      />,
    )

    expect(
      screen.getByRole("img", { name: "Nang Rentals profile photo" }),
    ).toHaveAttribute("src", "https://example.com/profile.jpg")
    expect(screen.getByLabelText("Online lister")).toBeInTheDocument()
  })

  it("falls back safely when image data is blank or the image cannot load", () => {
    const { rerender } = render(
      <ProfileAvatar displayName={undefined} photo={{ secureUrl: "   " }} />,
    )

    expect(screen.getByRole("img", { name: "Profile photo" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Active profile")).not.toBeInTheDocument()

    rerender(
      <ProfileAvatar
        displayName="Nang Rentals"
        photo={{ secureUrl: "https://example.com/broken.jpg" }}
        isActive
        statusLabel=" "
      />,
    )

    fireEvent.error(
      screen.getByRole("img", { name: "Nang Rentals profile photo" }),
    )

    expect(
      screen.getByRole("img", { name: "Nang Rentals profile photo" }),
    ).toHaveTextContent("N")
    expect(screen.getByLabelText("Active profile")).toBeInTheDocument()
  })
})

describe("ProfileIdentity", () => {
  it("renders normalized identity text and verification status", () => {
    render(
      <ProfileIdentity
        displayName=" Nang Rentals "
        isVerified
        secondaryText=" nang@example.com "
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Nang Rentals" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Verified profile")).toBeInTheDocument()
    expect(screen.getByText("nang@example.com")).toBeInTheDocument()
  })

  it("uses a stable fallback and omits empty optional text", () => {
    render(<ProfileIdentity displayName="   " secondaryText="   " />)

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Verified profile")).not.toBeInTheDocument()
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument()
  })
})

describe("ProfileDetails", () => {
  it("formats valid metadata and normalizes language values", () => {
    render(
      <ProfileDetails
        createdAt="2026-07-21T00:00:00.000Z"
        description=" Helpful local rentals. "
        languages={[" English ", "", "Thai", "English", "   "]}
      />,
    )

    expect(screen.getByText("Since Jul 2026")).toBeInTheDocument()
    expect(screen.getByText("English · Thai")).toBeInTheDocument()
    expect(screen.getByText("Helpful local rentals.")).toBeInTheDocument()
  })

  it("handles invalid and absent optional data without crashing", () => {
    render(
      <ProfileDetails
        createdAt="not-a-date"
        description={null}
        languages={undefined}
      />,
    )

    expect(screen.queryByText(/^Since /)).not.toBeInTheDocument()
    expect(screen.getByText("No bio added yet.")).toBeInTheDocument()
  })
})

describe("ProfileStatList", () => {
  it("renders zero values and excludes explicitly hidden items", () => {
    render(
      <ProfileStatList
        items={[
          { id: "listings", value: 0, label: "Listings" },
          { id: "hidden", value: 3, label: "Hidden", hidden: true },
        ]}
      />,
    )

    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText("Listings")).toBeInTheDocument()
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument()
  })

  it.each([null, undefined, []] as const)(
    "renders nothing for an empty item collection: %s",
    (items) => {
      const { container } = render(<ProfileStatList items={items} />)

      expect(container).toBeEmptyDOMElement()
    },
  )
})
