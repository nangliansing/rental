import { describe, expect, it } from "vitest"

import { extractAgentProfileIds } from "./extractAgentProfileIds"

describe("extractAgentProfileIds", () => {
  it("returns an empty array when filters are missing", () => {
    expect(extractAgentProfileIds(undefined)).toEqual([])
  })

  it("returns an empty array when no lister ids are present", () => {
    expect(extractAgentProfileIds({})).toEqual([])
    expect(
      extractAgentProfileIds({
        minRent: 1_000,
        agentProfileIds: [],
        listerIds: [],
      }),
    ).toEqual([])
  })

  it("returns agentProfileIds when only that field is set", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["agent-1", "agent-2"],
      }),
    ).toEqual(["agent-1", "agent-2"])
  })

  it("returns listerIds when only that alias field is set", () => {
    expect(
      extractAgentProfileIds({
        listerIds: ["lister-1"],
      }),
    ).toEqual(["lister-1"])
  })

  it("merges agentProfileIds and listerIds in order", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["agent-1"],
        listerIds: ["lister-1"],
      }),
    ).toEqual(["agent-1", "lister-1"])
  })

  it("deduplicates ids that appear in both fields", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["agent-1", "shared-id"],
        listerIds: ["shared-id", "lister-2"],
      }),
    ).toEqual(["agent-1", "shared-id", "lister-2"])
  })

  it("deduplicates repeated ids within the same field", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["agent-1", "agent-1", "agent-2"],
      }),
    ).toEqual(["agent-1", "agent-2"])
  })

  it("trims surrounding whitespace from valid ids", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["  agent-1  ", "\tagent-2\n"],
        listerIds: [" lister-1 "],
      }),
    ).toEqual(["agent-1", "agent-2", "lister-1"])
  })

  it("drops blank and whitespace-only ids", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["", "   ", "\t", "agent-1"],
        listerIds: ["\n", "lister-1"],
      }),
    ).toEqual(["agent-1", "lister-1"])
  })

  it("ignores non-string runtime values defensively", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: [
          "agent-1",
          null,
          undefined,
          123,
          {},
          [],
        ] as unknown as string[],
        listerIds: [false, "lister-1"] as unknown as string[],
      }),
    ).toEqual(["agent-1", "lister-1"])
  })

  it("does not mutate the input filters object", () => {
    const filters = {
      agentProfileIds: ["  agent-1  "],
      listerIds: [" lister-1 "],
    }

    extractAgentProfileIds(filters)

    expect(filters).toEqual({
      agentProfileIds: ["  agent-1  "],
      listerIds: [" lister-1 "],
    })
  })

  it("completes in bounded time for large id lists", () => {
    const largeIdList = Array.from({ length: 5_000 }, (_, index) => `agent-${index}`)
    const startedAt = performance.now()

    const result = extractAgentProfileIds({
      agentProfileIds: largeIdList,
      listerIds: largeIdList,
    })

    const elapsedMs = performance.now() - startedAt

    expect(result).toHaveLength(5_000)
    expect(elapsedMs).toBeLessThan(100)
  })

  it("preserves first-seen order when deduplicating", () => {
    expect(
      extractAgentProfileIds({
        agentProfileIds: ["b-id", "a-id"],
        listerIds: ["a-id", "c-id"],
      }),
    ).toEqual(["b-id", "a-id", "c-id"])
  })
})
