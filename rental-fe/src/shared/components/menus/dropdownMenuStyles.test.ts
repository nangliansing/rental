import { describe, expect, it } from "vitest"

import {
  DROPDOWN_MENU_CONTENT_CLASSNAME,
  DROPDOWN_MENU_ITEM_BASE_CLASSNAME,
  DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
  DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
  DROPDOWN_MENU_ITEM_STACKED_CLASSNAME,
} from "./dropdownMenuStyles"

describe("dropdownMenuStyles", () => {
  it("keeps action menus on a shared panel and item scale", () => {
    expect(DROPDOWN_MENU_CONTENT_CLASSNAME).toContain("min-w-56")
    expect(DROPDOWN_MENU_CONTENT_CLASSNAME).toContain("rounded-xl")
    expect(DROPDOWN_MENU_CONTENT_CLASSNAME).toContain("p-1.5")

    for (const className of [
      DROPDOWN_MENU_ITEM_BASE_CLASSNAME,
      DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME,
      DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
      DROPDOWN_MENU_ITEM_STACKED_CLASSNAME,
    ]) {
      expect(className).toContain("gap-3")
      expect(className).toContain("px-3")
      expect(className).toContain("py-3")
      expect(className).toContain("text-base")
      expect(className).toContain("font-semibold")
      expect(className).toContain("rounded-xl")
    }
  })
})
