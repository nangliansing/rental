import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSavedSearchCoverage } from "../modules/saved-search/utils/build-saved-search-coverage.js";

test("buildSavedSearchCoverage converts bounds to a closed polygon", () => {
  assert.deepEqual(
    buildSavedSearchCoverage({
      mode: "area",
      bounds: {
        northEast: { lat: 13.78, lng: 100.66 },
        southWest: { lat: 13.75, lng: 100.62 },
      },
    }),
    {
      type: "Polygon",
      coordinates: [[
        [100.62, 13.75],
        [100.66, 13.75],
        [100.66, 13.78],
        [100.62, 13.78],
        [100.62, 13.75],
      ]],
    },
  );
});

test("buildSavedSearchCoverage buffers nearby and line searches", () => {
  const nearby = buildSavedSearchCoverage({
    mode: "nearby",
    position: { lat: 13.75, lng: 100.64 },
    radiusMeters: 500,
  });
  const line = buildSavedSearchCoverage({
    mode: "line",
    geometry: {
      type: "LineString",
      coordinates: [[100.62, 13.75], [100.66, 13.78]],
    },
    distanceMeters: 250,
  });

  for (const coverage of [nearby, line]) {
    assert.equal(["Polygon", "MultiPolygon"].includes(coverage.type), true);
    assert.equal(coverage.coordinates.length > 0, true);
  }
  assert.deepEqual(
    nearby.coordinates[0][0],
    nearby.coordinates[0].at(-1),
  );
});

test("buildSavedSearchCoverage rejects unsupported or malformed searches", () => {
  assert.throws(
    () => buildSavedSearchCoverage({ mode: "unsupported" }),
    (error) => error.code === "INVALID_SAVED_SEARCH_COVERAGE",
  );
  assert.throws(
    () =>
      buildSavedSearchCoverage({
        mode: "line",
        geometry: { type: "LineString", coordinates: [] },
        distanceMeters: 100,
      }),
    (error) => error.code === "INVALID_SAVED_SEARCH_COVERAGE",
  );
});
