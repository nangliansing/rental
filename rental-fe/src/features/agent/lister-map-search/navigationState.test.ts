import { describe, expect, it } from "vitest"

import { listingPhoto } from "@/test/fixtures/listings"

import {
  createListerMapSearchNavigationState,
  isListerMapSearchSeedMatchingIds,
  LISTER_MAP_SEARCH_LOCATION_STATE_KEY,
  parseListerMapSearchSeed,
  readListerMapSearchSeedFromLocationState,
} from "./navigationState"

const validSeedInput = {
  _id: "agent-1",
  displayName: "Nang Lian Sing",
  profilePhoto: listingPhoto,
}

describe("createListerMapSearchNavigationState", () => {
  it("wraps the seed under the router location state key", () => {
    const seed = parseListerMapSearchSeed(validSeedInput)

    expect(seed).not.toBeNull()
    expect(createListerMapSearchNavigationState(seed!)).toEqual({
      [LISTER_MAP_SEARCH_LOCATION_STATE_KEY]: seed,
    })
  })

  it("does not mutate the provided seed object", () => {
    const seed = {
      _id: "agent-1",
      displayName: "Nang",
      profilePhoto: null,
    }
    const snapshot = { ...seed }

    createListerMapSearchNavigationState(seed)

    expect(seed).toEqual(snapshot)
  })
})

describe("parseListerMapSearchSeed", () => {
  it("parses a valid seed payload", () => {
    expect(parseListerMapSearchSeed(validSeedInput)).toMatchObject({
      _id: "agent-1",
      displayName: "Nang Lian Sing",
      profilePhoto: expect.objectContaining({
        secureUrl: listingPhoto.secureUrl,
      }),
    })
  })

  it("trims whitespace from the lister id", () => {
    expect(parseListerMapSearchSeed({ _id: "  agent-42  " })).toMatchObject({
      _id: "agent-42",
    })
  })

  it("returns null when the id is missing or blank", () => {
    expect(parseListerMapSearchSeed(null)).toBeNull()
    expect(parseListerMapSearchSeed(undefined)).toBeNull()
    expect(parseListerMapSearchSeed("agent-1")).toBeNull()
    expect(parseListerMapSearchSeed(123)).toBeNull()
    expect(parseListerMapSearchSeed([])).toBeNull()
    expect(parseListerMapSearchSeed({})).toBeNull()
    expect(parseListerMapSearchSeed({ _id: "" })).toBeNull()
    expect(parseListerMapSearchSeed({ _id: "   " })).toBeNull()
    expect(parseListerMapSearchSeed({ _id: "\t\n" })).toBeNull()
  })

  it("returns null when the id is not a string", () => {
    expect(parseListerMapSearchSeed({ _id: 123 })).toBeNull()
    expect(parseListerMapSearchSeed({ _id: true })).toBeNull()
    expect(parseListerMapSearchSeed({ _id: {} })).toBeNull()
  })

  it("normalizes optional display and photo fields", () => {
    expect(
      parseListerMapSearchSeed({
        _id: "agent-1",
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })

    expect(
      parseListerMapSearchSeed({
        _id: "agent-1",
        displayName: null,
        profilePhoto: null,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })

    expect(
      parseListerMapSearchSeed({
        _id: "agent-1",
        displayName: "",
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: "",
      profilePhoto: null,
    })

    expect(
      parseListerMapSearchSeed({
        _id: "agent-1",
        profilePhoto: { publicId: "", secureUrl: "" },
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })
  })

  it("completes in bounded time for large malformed payloads", () => {
    const largePayload = Object.fromEntries(
      Array.from({ length: 1_000 }, (_, index) => [`field-${index}`, index]),
    )
    const startedAt = performance.now()

    expect(parseListerMapSearchSeed(largePayload)).toBeNull()
    expect(performance.now() - startedAt).toBeLessThan(100)
  })
})

describe("readListerMapSearchSeedFromLocationState", () => {
  it("round-trips a valid seed through router location state", () => {
    const seed = parseListerMapSearchSeed(validSeedInput)
    const state = createListerMapSearchNavigationState(seed!)

    expect(readListerMapSearchSeedFromLocationState(state)).toEqual(seed)
  })

  it("returns null for invalid location state containers", () => {
    expect(readListerMapSearchSeedFromLocationState(null)).toBeNull()
    expect(readListerMapSearchSeedFromLocationState(undefined)).toBeNull()
    expect(readListerMapSearchSeedFromLocationState("state")).toBeNull()
    expect(readListerMapSearchSeedFromLocationState(123)).toBeNull()
    expect(readListerMapSearchSeedFromLocationState([])).toBeNull()
  })

  it("returns null when the navigation key is missing or invalid", () => {
    expect(readListerMapSearchSeedFromLocationState({})).toBeNull()
    expect(
      readListerMapSearchSeedFromLocationState({
        unrelated: validSeedInput,
      }),
    ).toBeNull()
    expect(
      readListerMapSearchSeedFromLocationState({
        [LISTER_MAP_SEARCH_LOCATION_STATE_KEY]: { _id: "  " },
      }),
    ).toBeNull()
  })

  it("ignores unrelated keys on the location state object", () => {
    const seed = parseListerMapSearchSeed(validSeedInput)

    expect(
      readListerMapSearchSeedFromLocationState({
        ...createListerMapSearchNavigationState(seed!),
        from: "/listers/agent-1",
      }),
    ).toEqual(seed)
  })
})

describe("isListerMapSearchSeedMatchingIds", () => {
  const seed = parseListerMapSearchSeed({ _id: "agent-1" })!

  it("matches when the seed id is included in the filter ids", () => {
    expect(isListerMapSearchSeedMatchingIds(seed, ["agent-1"])).toBe(true)
    expect(isListerMapSearchSeedMatchingIds(seed, ["agent-2", "agent-1"])).toBe(
      true,
    )
  })

  it("returns false when the seed id is not included", () => {
    expect(isListerMapSearchSeedMatchingIds(seed, [])).toBe(false)
    expect(isListerMapSearchSeedMatchingIds(seed, ["agent-2"])).toBe(false)
  })

  it("matches trimmed filter ids defensively", () => {
    expect(isListerMapSearchSeedMatchingIds(seed, ["  agent-1  "])).toBe(true)
  })

  it("ignores non-string filter ids defensively", () => {
    expect(
      isListerMapSearchSeedMatchingIds(seed, [
        null,
        undefined,
        123,
        "agent-1",
      ] as unknown as string[]),
    ).toBe(true)

    expect(
      isListerMapSearchSeedMatchingIds(seed, [null, 123] as unknown as string[]),
    ).toBe(false)
  })

  it("returns false when the seed id is empty", () => {
    expect(
      isListerMapSearchSeedMatchingIds(
        { _id: "", displayName: null, profilePhoto: null },
        ["agent-1"],
      ),
    ).toBe(false)
  })

  it("completes in bounded time for large id lists", () => {
    const ids = Array.from({ length: 5_000 }, (_, index) => `agent-${index}`)
    ids.push("agent-1")
    const startedAt = performance.now()

    expect(isListerMapSearchSeedMatchingIds(seed, ids)).toBe(true)
    expect(performance.now() - startedAt).toBeLessThan(100)
  })
})
