import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Avatar } from "./Avatar"
import { getAvatarInitial } from "./avatar-utils"

describe("Avatar", () => {
  it("renders a normalized profile image with accessible text", () => {
    render(
      <Avatar
        displayName=" Jessie "
        photo={{ secureUrl: " https://example.com/jessie.jpg ", alt: " " }}
        loading="eager"
      />,
    )

    const image = screen.getByRole("img", {
      name: "Jessie profile photo",
    })
    expect(image).toHaveAttribute("src", "https://example.com/jessie.jpg")
    expect(image).toHaveAttribute("loading", "eager")
    expect(image).toHaveAttribute("decoding", "async")
  })

  it("uses an initial when an image is absent or fails", () => {
    const { rerender } = render(<Avatar displayName=" Jessie " />)

    expect(
      screen.getByRole("img", { name: "Jessie profile photo" }),
    ).toHaveTextContent("J")

    rerender(
      <Avatar
        displayName="Jessie"
        photo={{ secureUrl: "https://example.com/broken.jpg" }}
      />,
    )
    fireEvent.error(
      screen.getByRole("img", { name: "Jessie profile photo" }),
    )

    expect(
      screen.getByRole("img", { name: "Jessie profile photo" }),
    ).toHaveTextContent("J")
  })

  it("uses a generic icon and label when no usable name exists", () => {
    render(<Avatar displayName="   " photo={{ secureUrl: " " }} />)

    const fallback = screen.getByRole("img", { name: "Profile photo" })
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveTextContent("")
    expect(fallback.querySelector("svg")).toBeInTheDocument()
  })

  it("selects deterministic colors from an explicit stable key", () => {
    render(
      <>
        <Avatar displayName="Jessie" colorKey="user-123" />
        <Avatar displayName="Changed name" colorKey="user-123" />
      </>,
    )

    const [first, second] = screen.getAllByRole("img")
    expect(first.parentElement?.className).toBe(second.parentElement?.className)
  })

  it("supports Unicode graphemes and defensive non-string values", () => {
    expect(getAvatarInitial(" ณัฐ ")).toBe("ณั")
    expect(getAvatarInitial("👩‍💻 Developer")).toBe("👩‍💻")
    expect(getAvatarInitial(undefined)).toBe("")
    expect(getAvatarInitial(42)).toBe("")
  })
})
