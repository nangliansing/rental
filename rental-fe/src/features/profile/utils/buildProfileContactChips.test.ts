import { describe, expect, it } from "vitest"

import { buildProfileContactChips } from "./buildProfileContactChips"

describe("buildProfileContactChips", () => {
  it("returns chips only for trimmed non-empty contact values", () => {
    expect(
      buildProfileContactChips({
        phone: " 0812345678 ",
        lineUrl: "https://line.me/ti/p/example",
        whatsappPhone: "   ",
        telegramUrl: null,
        viberPhone: undefined,
      }),
    ).toEqual([
      expect.objectContaining({
        id: "line",
        label: "Line",
        value: "https://line.me/ti/p/example",
      }),
      expect.objectContaining({ id: "phone", label: "Phone", value: "0812345678" }),
    ])
  })

  it("returns an empty list when no contact fields are populated", () => {
    expect(buildProfileContactChips({})).toEqual([])
    expect(
      buildProfileContactChips({
        phone: "",
        lineUrl: " ",
        whatsappPhone: null,
      }),
    ).toEqual([])
  })
})
