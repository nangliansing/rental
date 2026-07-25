import { describe, expect, it } from "vitest"

import { buildContactLinks } from "./buildContactLinks"

describe("buildContactLinks", () => {
  it("trims whitespace-only contact values and skips empty channels", () => {
    const links = buildContactLinks({
      phone: "  ",
      lineUrl: "  https://line.me/ti/p/abc ",
      whatsappPhone: "  ",
      telegramUrl: null,
      viberPhone: undefined,
    })

    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      type: "line",
      href: "https://line.me/ti/p/abc",
      action: "open",
    })
  })

  it("skips invalid http(s) contact URLs", () => {
    const links = buildContactLinks({
      lineUrl: "javascript:alert(1)",
      telegramUrl: "not-a-url",
      phone: "0812345678",
    })

    expect(links).toHaveLength(1)
    expect(links[0]?.type).toBe("phone")
  })

  it("normalizes WhatsApp phone digits and adds listing context", () => {
    const links = buildContactLinks(
      { whatsappPhone: "+66 81-234-5678" },
      {
        type: "listing",
        url: "https://example.com/listings/1",
        message: "Hi, I'm interested in this room: https://example.com/listings/1",
      },
    )

    expect(links).toHaveLength(1)
    expect(links[0]?.type).toBe("whatsapp")
    expect(links[0]?.action).toBe("open")
    expect(links[0]?.href).toContain("https://wa.me/66812345678?text=")
    expect(decodeURIComponent(links[0]?.href?.split("?text=")[1] ?? "")).toBe(
      "Hi, I'm interested in this room: https://example.com/listings/1",
    )
  })

  it("builds profile context copy when only a profile URL is provided", () => {
    const links = buildContactLinks(
      { lineUrl: "https://line.me/ti/p/abc" },
      {
        type: "profile",
        url: "https://example.com/listers/1",
      },
    )

    expect(links[0]).toMatchObject({
      type: "line",
      action: "open-and-copy",
      copyText: "Hi, I found your rental profile: https://example.com/listers/1",
    })
  })

  it("skips WhatsApp when the normalized phone is empty", () => {
    const links = buildContactLinks({ whatsappPhone: "++--" })

    expect(links).toHaveLength(0)
  })

  it("orders contacts consistently and exposes phone as tel link", () => {
    const links = buildContactLinks({
      phone: "0812345678",
      lineUrl: "https://line.me/ti/p/abc",
      whatsappPhone: "66812345678",
      telegramUrl: "https://t.me/example",
      viberPhone: "66812345678",
    })

    expect(links.map((link) => link.type)).toEqual([
      "line",
      "whatsapp",
      "telegram",
      "viber",
      "phone",
    ])
    expect(links.at(-1)).toMatchObject({
      type: "phone",
      href: "tel:0812345678",
      action: "open",
    })
    expect(links.find((link) => link.type === "viber")?.href).toBe(
      "viber://chat?number=%2B66812345678",
    )
  })
})
