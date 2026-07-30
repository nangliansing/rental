import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"

import { describe, expect, it } from "vitest"

function collectProductionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return collectProductionSources(path)
    if (![".ts", ".tsx"].includes(extname(entry.name))) return []
    if (entry.name.includes(".test.") || entry.name.includes(".spec.")) return []
    return [path]
  })
}

describe("query-options architecture", () => {
  const sources = collectProductionSources(join(process.cwd(), "src"))

  it("does not declare options inline at useQuery call sites", () => {
    const violations = sources.filter(path =>
      /use(?:Infinite)?Query\s*\(\s*\{/.test(readFileSync(path, "utf8")),
    )

    expect(violations).toEqual([])
  })

  it("forwards AbortSignal from every query function", () => {
    const violations = sources.flatMap(path => {
      const source = readFileSync(path, "utf8")
      const queryFunctions = source.matchAll(
        /queryFn\s*:\s*\(\{([^}]*)\}\)\s*=>/g,
      )

      for (const match of queryFunctions) {
        if (!match[1].split(",").some(part => part.trim() === "signal")) {
          return [path]
        }
      }

      return []
    })

    expect(violations).toEqual([])
  })

  it("uses the shared defensive pagination contract", () => {
    const violations = sources.flatMap(path => {
      const source = readFileSync(path, "utf8")
      if (!source.includes("infiniteQueryOptions({")) return []
      if (!source.includes("getNextPageParam")) return [path]
      if (/getNextPageParam\s*:\s*\(/.test(source)) return [path]
      if (/Number\s*\(\s*pageParam\s*\)/.test(source)) return [path]
      return []
    })

    expect(violations).toEqual([])
  })
})
