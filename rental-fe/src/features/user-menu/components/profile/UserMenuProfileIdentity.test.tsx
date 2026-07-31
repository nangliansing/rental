import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { AuthUser } from "@/features/auth/types"

import { UserMenuProfileIdentity } from "./UserMenuProfileIdentity"

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
}

const user: AuthUser = {
  _id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

vi.mock("@/shared/components/data-display/Avatar", () => ({
  Avatar: ({
    displayName,
    photo,
  }: {
    displayName: string
    photo: { secureUrl: string } | null
  }) => (
    <div data-testid="avatar" data-display-name={displayName}>
      <span>{photo?.secureUrl ?? "no-photo"}</span>
    </div>
  ),
}))

describe("UserMenuProfileIdentity", () => {
  it("renders the account name and email", () => {
    render(<UserMenuProfileIdentity user={user} />)

    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    expect(screen.getByText("jane@example.com")).toBeInTheDocument()
  })

  it("passes profilePhoto to the avatar when present", () => {
    render(
      <UserMenuProfileIdentity
        user={{ ...user, profilePhoto: sampleProfilePhoto }}
      />,
    )

    expect(screen.getByText(sampleProfilePhoto.secureUrl)).toBeInTheDocument()
  })

  it("falls back when profilePhoto is null", () => {
    render(<UserMenuProfileIdentity user={user} />)

    expect(screen.getByText("no-photo")).toBeInTheDocument()
  })
})
