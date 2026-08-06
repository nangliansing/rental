import { describe, expect, it } from "vitest"

import {
  DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
  DIALOG_ACTION_BUTTON_DANGER_CLASSNAME,
  DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME,
  DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME,
} from "./dialogActionButtonStyles"

describe("dialogActionButtonStyles", () => {
  it("keeps action buttons on a shared height, type size, and weight", () => {
    for (const className of [
      DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
      DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME,
      DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME,
      DIALOG_ACTION_BUTTON_DANGER_CLASSNAME,
    ]) {
      expect(className).toContain("h-11")
      expect(className).toContain("text-sm")
      expect(className).toContain("font-semibold")
      expect(className).toContain("rounded-full")
    }
  })
})
