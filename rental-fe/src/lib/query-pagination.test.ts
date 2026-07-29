import { describe, expect, it } from "vitest"

import {
  getNextPageParam,
  readPageParam,
} from "./query-pagination"

describe("query pagination", () => {
  it.each([
    [{ page: 1, limit: 20, total: 21 }, 2],
    [{ page: 2, limit: 20, total: 41 }, 3],
    [{ page: 1, limit: 20, total: 20 }, undefined],
    [{ page: 2, limit: 20, total: 20 }, undefined],
    [{ page: 1, limit: 20, total: 0 }, undefined],
  ])("calculates the next page defensively", (pagination, expected) => {
    expect(getNextPageParam({ pagination })).toBe(expected)
  })

  it.each([
    { page: 0, limit: 20, total: 100 },
    { page: -1, limit: 20, total: 100 },
    { page: 1.5, limit: 20, total: 100 },
    { page: 1, limit: 0, total: 100 },
    { page: 1, limit: -1, total: 100 },
    { page: 1, limit: 1.5, total: 100 },
    { page: 1, limit: 20, total: -1 },
    { page: 1, limit: 20, total: Number.NaN },
    { page: 1, limit: 20, total: Number.POSITIVE_INFINITY },
    { page: Number.MAX_SAFE_INTEGER + 1, limit: 20, total: 100 },
    { page: 1, limit: Number.MAX_SAFE_INTEGER + 1, total: 100 },
    { page: 1, limit: 20, total: Number.MAX_SAFE_INTEGER + 1 },
  ])("stops pagination for malformed metadata: %j", pagination => {
    expect(getNextPageParam({ pagination })).toBeUndefined()
  })

  it.each([
    [1, 1],
    [2, 2],
    ["3", 3],
    [" 4 ", 4],
    [0, 1],
    [-1, 1],
    [1.5, 1],
    [Number.MAX_SAFE_INTEGER + 1, 1],
    ["", 1],
    ["nope", 1],
    [undefined, 1],
    [null, 1],
  ])("normalizes pageParam %j to %j", (pageParam, expected) => {
    expect(readPageParam(pageParam)).toBe(expected)
  })
})
