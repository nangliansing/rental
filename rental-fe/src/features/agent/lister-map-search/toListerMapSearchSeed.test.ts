import { describe, expect, it } from "vitest"

import { listingPhoto } from "@/test/fixtures/listings"

import { toListerMapSearchSeed } from "./toListerMapSearchSeed"

describe("toListerMapSearchSeed", () => {
  it("builds a seed from a valid profile input", () => {
    expect(
      toListerMapSearchSeed({
        _id: "agent-1",
        displayName: "Nang Lian Sing",
        profilePhoto: listingPhoto,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: "Nang Lian Sing",
      profilePhoto: listingPhoto,
    })
  })

  it("builds a minimal seed when optional fields are omitted", () => {
    expect(toListerMapSearchSeed({ _id: "agent-1" })).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })
  })

  it("trims surrounding whitespace from the profile id", () => {
    expect(
      toListerMapSearchSeed({
        _id: "  agent-42  ",
        displayName: "Nang",
      }),
    ).toEqual({
      _id: "agent-42",
      displayName: "Nang",
      profilePhoto: null,
    })
  })

  it("returns null when the profile id is blank after trimming", () => {
    expect(toListerMapSearchSeed({ _id: "" })).toBeNull()
    expect(toListerMapSearchSeed({ _id: "   " })).toBeNull()
    expect(toListerMapSearchSeed({ _id: "\t\n" })).toBeNull()
  })

  it("returns null for invalid runtime profile containers", () => {
    expect(toListerMapSearchSeed(null as unknown as { _id: string })).toBeNull()
    expect(
      toListerMapSearchSeed(undefined as unknown as { _id: string }),
    ).toBeNull()
    expect(toListerMapSearchSeed("agent-1" as unknown as { _id: string })).toBeNull()
    expect(toListerMapSearchSeed(123 as unknown as { _id: string })).toBeNull()
  })

  it("returns null when the profile id is not a string at runtime", () => {
    expect(toListerMapSearchSeed({ _id: 123 as unknown as string })).toBeNull()
    expect(toListerMapSearchSeed({ _id: null as unknown as string })).toBeNull()
    expect(toListerMapSearchSeed({ _id: {} as unknown as string })).toBeNull()
  })

  it("normalizes optional displayName values", () => {
    expect(
      toListerMapSearchSeed({
        _id: "agent-1",
        displayName: null,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })

    expect(
      toListerMapSearchSeed({
        _id: "agent-1",
        displayName: "",
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: "",
      profilePhoto: null,
    })
  })

  it("normalizes optional profilePhoto values", () => {
    expect(
      toListerMapSearchSeed({
        _id: "agent-1",
        profilePhoto: null,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })

    expect(
      toListerMapSearchSeed({
        _id: "agent-1",
        profilePhoto: listingPhoto,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: listingPhoto,
    })
  })

  it("does not mutate the input profile object", () => {
    const profile = {
      _id: "  agent-1  ",
      displayName: "Nang",
      profilePhoto: listingPhoto,
    }
    const snapshot = {
      ...profile,
      profilePhoto: listingPhoto,
    }

    toListerMapSearchSeed(profile)

    expect(profile).toEqual(snapshot)
  })

  it("returns a new seed object without reusing the input reference", () => {
    const profile = {
      _id: "agent-1",
      displayName: "Nang",
      profilePhoto: listingPhoto,
    }

    const seed = toListerMapSearchSeed(profile)

    expect(seed).not.toBe(profile)
    expect(seed?.profilePhoto).toBe(listingPhoto)
  })

  it("completes in bounded time for long profile ids", () => {
    const startedAt = performance.now()

    const seed = toListerMapSearchSeed({
      _id: "a".repeat(10_000),
      displayName: "Nang",
    })

    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(seed?._id).toHaveLength(10_000)
  })
})
