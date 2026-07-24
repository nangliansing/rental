import { describe, expect, it } from "vitest"

import { flattenUniqueInfiniteItems, uniqueItemsByKey } from "./infinitePages"

describe("uniqueItemsByKey", () => {
  it("preserves order and drops duplicate, missing, and blank identities", () => {
    const first = { _id: " a " }
    const duplicate = { _id: "a" }

    expect(
      uniqueItemsByKey({
        items: [first, null, duplicate, { _id: "" }, { _id: "b" }],
        getKey: (item) => item._id,
      }),
    ).toEqual([first, { _id: "b" }])
  })
})

describe("flattenUniqueInfiniteItems", () => {
  it("preserves first-seen server order while removing overlapping items", () => {
    const result = flattenUniqueInfiniteItems({
      data: {
        pages: [
          { items: [{ _id: "a" }, { _id: "b" }] },
          { items: [{ _id: "b" }, { _id: "c" }] },
        ],
      },
      getItems: (page) => page.items,
      getKey: (item) => item._id,
    })

    expect(result.map((item) => item._id)).toEqual(["a", "b", "c"])
  })

  it("ignores null records and items without a usable identity", () => {
    const result = flattenUniqueInfiniteItems({
      data: {
        pages: [{ items: [null, { _id: "" }, { _id: "valid" }] }],
      },
      getItems: (page) => page.items,
      getKey: (item) => item._id,
    })

    expect(result).toEqual([{ _id: "valid" }])
  })

  it("returns an empty collection for missing and empty pages", () => {
    const getItems = (page: { items: { _id: string }[] }) => page.items
    const getKey = (item: { _id: string }) => item._id

    expect(flattenUniqueInfiniteItems({ data: undefined, getItems, getKey })).toEqual([])
    expect(
      flattenUniqueInfiniteItems({ data: { pages: [] }, getItems, getKey }),
    ).toEqual([])
  })
})
