import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { indexModels } from "../scripts/database/index-models.js";
import {
  indexSignature,
  normalizeExpectedIndex,
  normalizeIndex,
} from "../scripts/database/index-utils.js";

const getModel = (name) => {
  const model = indexModels.find((candidate) => candidate.modelName === name);
  assert.ok(model, `Expected model ${name}`);
  return model;
};

const assertSchemaIndex = (modelName, keys, expectedOptions = {}) => {
  const indexes = getModel(modelName).schema.indexes();
  const match = indexes.find(
    ([candidateKeys]) => JSON.stringify(candidateKeys) === JSON.stringify(keys),
  );

  assert.ok(match, `${modelName} is missing ${JSON.stringify(keys)}`);

  for (const [key, value] of Object.entries(expectedOptions)) {
    assert.deepEqual(match[1][key], value);
  }
};

describe("database index contracts", () => {
  test("covers default and filtered administrative timelines", () => {
    assertSchemaIndex("User", { role: 1, createdAt: -1, _id: 1 });
    assertSchemaIndex("Report", { targetType: 1, createdAt: -1, _id: 1 });
    assertSchemaIndex("Report", {
      targetType: 1,
      status: 1,
      createdAt: -1,
      _id: 1,
    });
    assertSchemaIndex("ReviewReport", {
      isDeleted: 1,
      createdAt: -1,
      _id: 1,
    });
    assertSchemaIndex("Suspension", { createdAt: -1, _id: 1 });
    assertSchemaIndex("Suspension", {
      status: 1,
      createdAt: -1,
      _id: 1,
    });
    assertSchemaIndex("BuildingEditRequest", { createdAt: -1, _id: 1 });
  });

  test("covers sorted public listing lookups from buildings", () => {
    assertSchemaIndex("Listing", {
      buildingId: 1,
      isDeleted: 1,
      visibility: 1,
      updatedAt: -1,
      _id: 1,
    });
    assertSchemaIndex("Listing", {
      buildingId: 1,
      isDeleted: 1,
      visibility: 1,
      listedBy: 1,
      updatedAt: -1,
      _id: 1,
    });
  });

  test("preserves integrity and lifecycle indexes", () => {
    assertSchemaIndex(
      "AuthIdentity",
      { userId: 1, provider: 1 },
      { unique: true },
    );
    assertSchemaIndex(
      "AuthIdentity",
      { provider: 1, providerSubject: 1 },
      {
        unique: true,
        partialFilterExpression: { providerSubject: { $type: "string" } },
      },
    );
    assertSchemaIndex(
      "SavedListing",
      { userId: 1, listingId: 1 },
      { unique: true },
    );
    assertSchemaIndex(
      "BuildingFollow",
      { userId: 1, buildingId: 1 },
      { unique: true },
    );
    assertSchemaIndex("BuildingFollow", { userId: 1, createdAt: -1, _id: -1 });
    assertSchemaIndex("BuildingFollow", {
      buildingId: 1,
      createdAt: -1,
      _id: -1,
    });
    assertSchemaIndex(
      "Notification",
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
    assertSchemaIndex(
      "BuildingEditRequest",
      { buildingId: 1, requestedBy: 1, status: 1 },
      { unique: true },
    );
    assertSchemaIndex(
      "SavedSearch",
      { "geoSearch.coverage": "2dsphere" },
      {
        name: "active_saved_search_coverage_2dsphere",
        partialFilterExpression: {
          status: "Waiting",
          isDeleted: false,
        },
      },
    );
    assertSchemaIndex(
      "SavedSearch",
      {
        createdBy: 1,
        isDeleted: 1,
        status: 1,
        lastConfirmedAt: -1,
        createdAt: -1,
        _id: 1,
      },
      { name: "owner_saved_search_confirmation_recency" },
    );
  });

  test("normalizes actual and expected index metadata consistently", () => {
    const expected = normalizeExpectedIndex([
      { reviewId: 1, reportedBy: 1 },
      {
        unique: true,
        partialFilterExpression: { status: "OPEN", isDeleted: false },
      },
    ]);
    const actual = normalizeIndex({
      name: "reviewId_1_reportedBy_1",
      key: { reviewId: 1, reportedBy: 1 },
      unique: true,
      partialFilterExpression: { isDeleted: false, status: "OPEN" },
      version: 2,
    });

    assert.equal(indexSignature(actual), indexSignature(expected));
  });
});
