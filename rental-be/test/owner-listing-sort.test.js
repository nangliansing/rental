import assert from "node:assert/strict";
import test from "node:test";

import { buildOwnerListingSort } from "../modules/listing/utils/build-owner-listing-sort.js";

test("buildOwnerListingSort keeps createdAt sorting for non-soon filters", () => {
  assert.deepEqual(
    buildOwnerListingSort({ filter: "all", sort: "latest" }),
    { createdAt: -1, _id: 1 },
  );

  assert.deepEqual(
    buildOwnerListingSort({ filter: "now", sort: "latest" }),
    { createdAt: -1, _id: 1 },
  );

  assert.deepEqual(
    buildOwnerListingSort({ filter: "private", sort: "oldest" }),
    { createdAt: 1, _id: -1 },
  );
});

test("buildOwnerListingSort prioritizes availableAt for soon filter", () => {
  assert.deepEqual(
    buildOwnerListingSort({ filter: "soon", sort: "latest" }),
    { availableAt: 1, createdAt: -1, _id: 1 },
  );

  assert.deepEqual(
    buildOwnerListingSort({ filter: "soon", sort: "oldest" }),
    { availableAt: 1, createdAt: 1, _id: -1 },
  );
});
