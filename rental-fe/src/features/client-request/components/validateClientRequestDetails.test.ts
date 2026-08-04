import { describe, expect, it } from "vitest"

import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
} from "../api/createOwnerClientRequest"
import { validateClientRequestDetails } from "./validateClientRequestDetails"

describe("validateClientRequestDetails", () => {
  describe("name required", () => {
    it("rejects an empty name", () => {
      expect(
        validateClientRequestDetails({ name: "", description: "" }),
      ).toEqual({
        ok: false,
        errors: { name: "Enter a name for this request." },
      })
    })

    it("rejects a whitespace-only name", () => {
      expect(
        validateClientRequestDetails({ name: "  \t\n  ", description: "ok" }),
      ).toEqual({
        ok: false,
        errors: { name: "Enter a name for this request." },
      })
    })
  })

  describe("name length", () => {
    it("accepts a name at the max length", () => {
      const name = "n".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH)

      expect(
        validateClientRequestDetails({ name, description: "" }),
      ).toEqual({
        ok: true,
        value: { name, description: null },
      })
    })

    it("rejects a name longer than the max length", () => {
      expect(
        validateClientRequestDetails({
          name: "n".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH + 1),
          description: "",
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: `Name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters.`,
        },
      })
    })

    it("measures length after trimming leading and trailing spaces", () => {
      const core = "n".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH)

      expect(
        validateClientRequestDetails({
          name: `  ${core}  `,
          description: "",
        }),
      ).toEqual({
        ok: true,
        value: { name: core, description: null },
      })

      expect(
        validateClientRequestDetails({
          name: `  ${"n".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH + 1)}  `,
          description: "",
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: `Name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters.`,
        },
      })
    })
  })

  describe("notes / description", () => {
    it("treats empty notes as null", () => {
      expect(
        validateClientRequestDetails({ name: "Family", description: "" }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description: null },
      })
    })

    it("treats whitespace-only notes as null", () => {
      expect(
        validateClientRequestDetails({
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
        validateClientRequestDetails({
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
        validateClientRequestDetails({
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
      const description = "d".repeat(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH)

      expect(
        validateClientRequestDetails({ name: "Family", description }),
      ).toEqual({
        ok: true,
        value: { name: "Family", description },
      })
    })

    it("rejects notes longer than the max length", () => {
      expect(
        validateClientRequestDetails({
          name: "Family",
          description: "d".repeat(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ).toEqual({
        ok: false,
        errors: {
          description: `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })
    })

    it("measures notes length after trimming", () => {
      const core = "d".repeat(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH)

      expect(
        validateClientRequestDetails({
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
        validateClientRequestDetails({
          name: "",
          description: "d".repeat(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: "Enter a name for this request.",
          description: `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })
    })

    it("returns both length errors when name and notes are too long", () => {
      expect(
        validateClientRequestDetails({
          name: "n".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH + 1),
          description: "d".repeat(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ).toEqual({
        ok: false,
        errors: {
          name: `Name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters.`,
          description: `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })
    })

    it("does not add a notes error when only the name fails", () => {
      expect(
        validateClientRequestDetails({
          name: "  ",
          description: "valid notes",
        }),
      ).toEqual({
        ok: false,
        errors: { name: "Enter a name for this request." },
      })
    })
  })
})
