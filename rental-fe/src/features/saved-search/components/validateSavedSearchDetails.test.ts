import { describe, expect, it } from "vitest"

import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
} from "../api/createOwnerSavedSearch"
import { validateSavedSearchDetails } from "./validateSavedSearchDetails"

describe("validateSavedSearchDetails", () => {
  describe("name required", () => {
    it("rejects an empty name", () => {
      expect(
        validateSavedSearchDetails({ name: "", description: "" }),
      ).toEqual({
        ok: false,
        errors: { name: "Enter a name for this search." },
      })
    })

    it("rejects a whitespace-only name", () => {
      expect(
        validateSavedSearchDetails({ name: "  \t\n  ", description: "ok" }),
      ).toEqual({
        ok: false,
        errors: { name: "Enter a name for this search." },
      })
    })
  })

  describe("name length", () => {
    it("accepts a name at the max length", () => {
      const name = "n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH)

      expect(
        validateSavedSearchDetails({ name, description: "" }),
      ).toEqual({
        ok: true,
        value: { name, description: null },
      })
    })

    it("rejects a name longer than the max length", () => {
      expect(
        validateSavedSearchDetails({
          name: "n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH + 1),
          description: "",
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: `Name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters.`,
        },
      })
    })

    it("measures length after trimming leading and trailing spaces", () => {
      const core = "n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH)

      expect(
        validateSavedSearchDetails({
          name: `  ${core}  `,
          description: "",
        }),
      ).toEqual({
        ok: true,
        value: { name: core, description: null },
      })

      expect(
        validateSavedSearchDetails({
          name: `  ${"n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH + 1)}  `,
          description: "",
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: `Name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters.`,
        },
      })
    })
  })

  describe("notes / description", () => {
    it("treats empty notes as null", () => {
      expect(
        validateSavedSearchDetails({ name: "Family", description: "" }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description: null },
      })
    })

    it("treats whitespace-only notes as null", () => {
      expect(
        validateSavedSearchDetails({
          name: "  Family  ",
          description: "  \n\t  ",
        }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description: null },
      })
    })

    it("keeps trimmed notes", () => {
      expect(
        validateSavedSearchDetails({
          name: "Family",
          description: " LINE: family01 ",
        }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description: "LINE: family01" },
      })
    })

    it("preserves internal whitespace in notes", () => {
      expect(
        validateSavedSearchDetails({
          name: "Family",
          description: "Call after 6pm\nLINE: family01",
        }),
      ).toEqual({
        ok: true,
        value: {
          name: "Family",
          description: "Call after 6pm\nLINE: family01",
        },
      })
    })

    it("accepts notes at the max length", () => {
      const description = "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH)

      expect(
        validateSavedSearchDetails({ name: "Family", description }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description },
      })
    })

    it("rejects notes longer than the max length", () => {
      expect(
        validateSavedSearchDetails({
          name: "Family",
          description: "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ).toEqual({
        ok: false,
        errors: {
          description: `Notes must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })
    })

    it("measures notes length after trimming", () => {
      const core = "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH)

      expect(
        validateSavedSearchDetails({
          name: "Family",
          description: `  ${core}  `,
        }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description: core },
      })
    })
  })

  describe("combined errors", () => {
    it("returns name and notes errors together when both fail", () => {
      expect(
        validateSavedSearchDetails({
          name: "",
          description: "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: "Enter a name for this search.",
          description: `Notes must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })
    })

    it("returns both length errors when name and notes are too long", () => {
      expect(
        validateSavedSearchDetails({
          name: "n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH + 1),
          description: "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: `Name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters.`,
          description: `Notes must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })
    })

    it("does not add a notes error when only the name fails", () => {
      expect(
        validateSavedSearchDetails({
          name: "  ",
          description: "valid notes",
        }),
      ).toEqual({
        ok: false,
        errors: { name: "Enter a name for this search." },
      })
    })
  })
})
