import assert from "node:assert/strict";
import test from "node:test";

import { buildLineBufferGeometry } from "../shared/geo/index.js";
import {
  validateDistanceMeters,
  validateLineGeometry,
} from "../shared/validators/index.js";
import { buildSearchBuildingsNearLinesParams } from "../modules/search/params/index.js";
import { buildSearchBuildingsNearLinesPipeline } from "../modules/search/pipelines/index.js";

const lineString = {
  type: "LineString",
  coordinates: [
    [100.5, 13.75],
    [100.51, 13.76],
  ],
};

test("validateLineGeometry accepts and normalizes LineString geometry", () => {
  assert.deepEqual(validateLineGeometry(lineString), lineString);
});

test("validateLineGeometry accepts MultiLineString geometry", () => {
  const geometry = {
    type: "MultiLineString",
    coordinates: [
      lineString.coordinates,
      [
        [100.51, 13.76],
        [100.52, 13.75],
      ],
    ],
  };

  assert.deepEqual(validateLineGeometry(geometry), geometry);
});

test("validateLineGeometry rejects malformed and unsafe geometry", () => {
  const invalidGeometries = [
    null,
    [],
    {},
    { type: "Point", coordinates: [100.5, 13.75] },
    { type: "LineString", coordinates: lineString.coordinates, extra: true },
    { type: "LineString", coordinates: [[100.5, 13.75]] },
    {
      type: "LineString",
      coordinates: [
        [100.5, 13.75],
        [100.5, 13.75],
      ],
    },
    {
      type: "LineString",
      coordinates: [
        [181, 13.75],
        [100.5, 13.75],
      ],
    },
    {
      type: "LineString",
      coordinates: [
        [100.5, 91],
        [100.51, 13.76],
      ],
    },
    {
      type: "LineString",
      coordinates: [
        ["100.5", 13.75],
        [100.51, 13.76],
      ],
    },
    {
      type: "LineString",
      coordinates: [
        [100.5, 13.75, 2],
        [100.51, 13.76],
      ],
    },
    { type: "MultiLineString", coordinates: [] },
    {
      type: "MultiLineString",
      coordinates: [[[100.5, 13.75]]],
    },
  ];

  for (const geometry of invalidGeometries) {
    assert.throws(
      () => validateLineGeometry(geometry),
      (error) => error.statusCode === 422 && error.code === "VALIDATION_ERROR",
    );
  }
});

test("validateLineGeometry enforces line and position complexity limits", () => {
  const validLines = Array.from({ length: 100 }, () => lineString.coordinates);
  assert.equal(
    validateLineGeometry({ type: "MultiLineString", coordinates: validLines })
      .coordinates.length,
    100,
  );

  assert.throws(() =>
    validateLineGeometry({
      type: "MultiLineString",
      coordinates: [...validLines, lineString.coordinates],
    }),
  );

  const positions = Array.from({ length: 1000 }, (_, index) => [
    100 + index / 100_000,
    13.75,
  ]);
  assert.equal(
    validateLineGeometry({ type: "LineString", coordinates: positions })
      .coordinates.length,
    1000,
  );
  assert.throws(() =>
    validateLineGeometry({
      type: "LineString",
      coordinates: [...positions, [100.02, 13.75]],
    }),
  );
});

test("validateDistanceMeters applies defaults and integer range validation", () => {
  const options = { defaultValue: 500, maxValue: 1000 };

  assert.equal(validateDistanceMeters(undefined, "distanceMeters", options), 500);
  assert.equal(validateDistanceMeters(750, "distanceMeters", options), 750);
  assert.equal(validateDistanceMeters(1, "distanceMeters", options), 1);
  assert.equal(validateDistanceMeters(1000, "distanceMeters", options), 1000);
  assert.throws(() => validateDistanceMeters(0, "distanceMeters", options));
  assert.throws(() => validateDistanceMeters(1001, "distanceMeters", options));
  assert.throws(() => validateDistanceMeters(1.5, "distanceMeters", options));
  assert.throws(() => validateDistanceMeters(null, "distanceMeters", options));
  assert.throws(() => validateDistanceMeters("500", "distanceMeters", options));
});

test("buildSearchBuildingsNearLinesParams reuses search filters and pagination", () => {
  const params = buildSearchBuildingsNearLinesParams({
    geometry: lineString,
    distanceMeters: 500,
    minRent: 10_000,
    page: 2,
    limit: 10,
  });

  assert.deepEqual(params.geometry, lineString);
  assert.equal(params.distanceMeters, 500);
  assert.equal(params.filters.listing.minRent, 10_000);
  assert.equal(params.page, 2);
  assert.equal(params.limit, 10);
  assert.equal(params.includeBuildingsWithoutMatchingListings, false);
});

test("buildSearchBuildingsNearLinesParams defaults distance and validates shared inputs", () => {
  const params = buildSearchBuildingsNearLinesParams({ geometry: lineString });

  assert.equal(params.distanceMeters, 500);
  assert.equal(params.page, 1);
  assert.equal(params.limit, 20);

  assert.throws(() => buildSearchBuildingsNearLinesParams(null));
  assert.throws(() =>
    buildSearchBuildingsNearLinesParams({
      geometry: lineString,
      includeBuildingsWithoutMatchingListings: "true",
    }),
  );
  assert.throws(() =>
    buildSearchBuildingsNearLinesParams({
      geometry: lineString,
      minRent: 20_000,
      maxRent: 10_000,
    }),
  );
});

test("buildLineBufferGeometry produces a MongoDB-compatible search polygon", () => {
  const searchArea = buildLineBufferGeometry(lineString, 500);

  assert.ok(["Polygon", "MultiPolygon"].includes(searchArea.type));
  assert.ok(Array.isArray(searchArea.coordinates));
  assert.ok(searchArea.coordinates.length > 0);
});

test("near-lines pipeline reuses the paginated building-search pipeline", () => {
  const searchArea = buildLineBufferGeometry(lineString, 500);
  const pipeline = buildSearchBuildingsNearLinesPipeline({
    searchArea,
    filters: { building: {}, listing: {}, agent: {} },
    page: 2,
    limit: 10,
  });

  assert.deepEqual(
    pipeline[0].$match.location.$geoWithin.$geometry,
    searchArea,
  );
  assert.ok(pipeline.some((stage) => stage.$lookup?.as === "listings"));

  const facet = pipeline.find((stage) => stage.$facet)?.$facet;
  assert.deepEqual(facet.data.slice(0, 2), [{ $skip: 10 }, { $limit: 10 }]);
  assert.deepEqual(facet.pagination, [{ $count: "total" }]);
});
