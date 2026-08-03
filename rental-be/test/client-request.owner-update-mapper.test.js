import assert from "node:assert/strict";
import { describe, test } from "node:test";
import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
  CLIENT_REQUEST_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/client-request/client-request.constants.js";
import { buildOwnerUpdateClientRequestRecord } from "../modules/client-request/mappers/build-owner-update-client-request-record.js";
import { validateAvailableBy } from "../modules/listing/listing.validation.js";

const agentProfileId = new mongoose.Types.ObjectId();
const secondAgentProfileId = new mongoose.Types.ObjectId();

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

const otherBounds = {
  northEast: { lat: 13.8, lng: 100.7 },
  southWest: { lat: 13.7, lng: 100.6 },
};

const validPosition = { lat: 13.73, lng: 100.54 };

const validLineGeometry = {
  type: "LineString",
  coordinates: [
    [100.6, 13.7],
    [100.7, 13.8],
  ],
};

const validMultiLineGeometry = {
  type: "MultiLineString",
  coordinates: [
    [
      [100.6, 13.7],
      [100.7, 13.8],
    ],
    [
      [100.61, 13.71],
      [100.71, 13.81],
    ],
  ],
};

// Stored dates are Thailand start-of-day, matching create/update validators.
const availableByDate = validateAvailableBy("2026-09-01");

const createExisting = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  createdBy: new mongoose.Types.ObjectId(),
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: CLIENT_REQUEST_STATUSES.WAITING,
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15_000,
    maxRent: 35_000,
    isForeignerAccepted: true,
    agentProfileIds: [agentProfileId],
  },
  isDeleted: false,
  deletedAt: null,
  ...overrides,
});

const assertValidationError = (fn, messageMatcher = null) => {
  assert.throws(fn, (error) => {
    if (!(error instanceof AppError)) return false;
    if (error.statusCode !== 422) return false;
    if (error.code !== "VALIDATION_ERROR") return false;
    if (messageMatcher == null) return true;
    if (typeof messageMatcher === "string") {
      return error.message === messageMatcher;
    }
    return messageMatcher.test(error.message);
  });
};

const assertNoValidChange = (fn) => {
  assert.throws(fn, (error) => {
    return (
      error instanceof AppError &&
      error.statusCode === 422 &&
      error.code === "NO_VALID_CHANGE" &&
      error.message === "No valid change"
    );
  });
};

describe("buildOwnerUpdateClientRequestRecord", () => {
  describe("body shape", () => {
    test("rejects null body", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: null,
            clientRequest: createExisting(),
          }),
        "body must be an object",
      );
    });

    test("rejects non-object body", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: "name",
            clientRequest: createExisting(),
          }),
        "body must be an object",
      );
    });

    test("rejects empty object as no valid change", () => {
      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {},
          clientRequest: createExisting(),
        }),
      );
    });
  });

  describe("whitelist / immutable fields", () => {
    for (const fieldName of [
      "createdBy",
      "status",
      "isDeleted",
      "deletedAt",
      "_id",
      "createdAt",
      "updatedAt",
    ]) {
      test(`rejects unknown immutable field: ${fieldName}`, () => {
        assertValidationError(
          () =>
            buildOwnerUpdateClientRequestRecord({
              body: {
                name: "Changed",
                [fieldName]:
                  fieldName === "status"
                    ? CLIENT_REQUEST_STATUSES.CLOSED
                    : fieldName === "isDeleted"
                      ? true
                      : new mongoose.Types.ObjectId().toString(),
              },
              clientRequest: createExisting(),
            }),
          new RegExp(`Unknown fields: ${fieldName}`),
        );
      });
    }

    test("lists every unknown field in the error message", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              status: CLIENT_REQUEST_STATUSES.CLOSED,
              createdBy: new mongoose.Types.ObjectId().toString(),
              isDeleted: true,
            },
            clientRequest: createExisting(),
          }),
        "Unknown fields: status, createdBy, isDeleted",
      );
    });

    test("does not apply any update when unknown fields are present", () => {
      assert.throws(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              name: "Should not apply",
              status: CLIENT_REQUEST_STATUSES.CLOSED,
            },
            clientRequest: createExisting(),
          }),
        (error) => error.code === "VALIDATION_ERROR",
      );
    });
  });

  describe("name", () => {
    test("trims and updates a changed name", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: { name: "  Updated name  " },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, { name: "Updated name" });
    });

    test("rejects blank name", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: { name: "   " },
            clientRequest: createExisting(),
          }),
        "name is required",
      );
    });

    test("rejects non-string name", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: { name: 123 },
            clientRequest: createExisting(),
          }),
        "name must be a string",
      );
    });

    test("rejects name longer than max length", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: { name: "a".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH + 1) },
            clientRequest: createExisting(),
          }),
        `name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters`,
      );
    });

    test("accepts name at max length", () => {
      const name = "a".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH);
      const update = buildOwnerUpdateClientRequestRecord({
        body: { name },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, { name });
    });

    test("treats trimmed-equal name as no change", () => {
      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: { name: "  Sukhumvit 2BR  " },
          clientRequest: createExisting(),
        }),
      );
    });
  });

  describe("description", () => {
    test("updates a changed description", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: { description: "  New notes  " },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, { description: "New notes" });
    });

    test("clears description when blank string is sent", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: { description: "   " },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, { description: null });
    });

    test("clears description when null is sent", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: { description: null },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, { description: null });
    });

    test("treats blank/null as no change when description is already null", () => {
      const existing = createExisting({ description: null });

      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: { description: null },
          clientRequest: existing,
        }),
      );

      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: { description: "   " },
          clientRequest: existing,
        }),
      );
    });

    test("rejects non-string description", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: { description: 42 },
            clientRequest: createExisting(),
          }),
        "description must be a string",
      );
    });

    test("rejects description longer than max length", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              description: "a".repeat(
                CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH + 1,
              ),
            },
            clientRequest: createExisting(),
          }),
        `description must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters`,
      );
    });
  });

  describe("geoSearch", () => {
    test("replaces area geoSearch with nearby", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          geoSearch: {
            mode: GEO_SEARCH_MODES.NEARBY,
            position: validPosition,
            radiusMeters: 800,
            placeName: "  Siam  ",
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, {
        geoSearch: {
          mode: GEO_SEARCH_MODES.NEARBY,
          position: validPosition,
          radiusMeters: 800,
          placeName: "Siam",
        },
      });
    });

    test("replaces area geoSearch with line", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          geoSearch: {
            mode: GEO_SEARCH_MODES.LINE,
            geometry: validLineGeometry,
            distanceMeters: 750,
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update.geoSearch, {
        mode: GEO_SEARCH_MODES.LINE,
        geometry: validLineGeometry,
        distanceMeters: 750,
        placeName: null,
      });
    });

    test("accepts MultiLineString geometry", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          geoSearch: {
            mode: GEO_SEARCH_MODES.LINE,
            geometry: validMultiLineGeometry,
            distanceMeters: 500,
            placeName: "Corridor",
          },
        },
        clientRequest: createExisting(),
      });

      assert.equal(update.geoSearch.geometry.type, "MultiLineString");
      assert.equal(update.geoSearch.placeName, "Corridor");
    });

    test("updates area bounds while keeping mode", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          geoSearch: {
            mode: GEO_SEARCH_MODES.AREA,
            bounds: otherBounds,
            placeName: "Phrom Phong",
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update.geoSearch.bounds, otherBounds);
    });

    test("clears placeName on area geoSearch", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          geoSearch: {
            mode: GEO_SEARCH_MODES.AREA,
            bounds: validBounds,
            placeName: "   ",
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, {
        geoSearch: {
          mode: GEO_SEARCH_MODES.AREA,
          bounds: validBounds,
          placeName: null,
        },
      });
    });

    test("treats equivalent area geoSearch as no change despite key order", () => {
      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            geoSearch: {
              placeName: "Phrom Phong",
              bounds: {
                southWest: validBounds.southWest,
                northEast: validBounds.northEast,
              },
              mode: GEO_SEARCH_MODES.AREA,
            },
          },
          clientRequest: createExisting(),
        }),
      );
    });

    test("treats equivalent nearby geoSearch as no change", () => {
      const existing = createExisting({
        geoSearch: {
          mode: GEO_SEARCH_MODES.NEARBY,
          position: validPosition,
          radiusMeters: 500,
          placeName: null,
        },
      });

      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            geoSearch: {
              mode: GEO_SEARCH_MODES.NEARBY,
              position: validPosition,
              radiusMeters: 500,
            },
          },
          clientRequest: existing,
        }),
      );
    });

    test("rejects missing mode", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: { geoSearch: { bounds: validBounds } },
            clientRequest: createExisting(),
          }),
        "mode is required",
      );
    });

    test("rejects area without bounds", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              geoSearch: { mode: GEO_SEARCH_MODES.AREA },
            },
            clientRequest: createExisting(),
          }),
      );
    });

    test("rejects nearby without radiusMeters", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              geoSearch: {
                mode: GEO_SEARCH_MODES.NEARBY,
                position: validPosition,
              },
            },
            clientRequest: createExisting(),
          }),
      );
    });

    test("rejects line without geometry", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              geoSearch: {
                mode: GEO_SEARCH_MODES.LINE,
                distanceMeters: 500,
              },
            },
            clientRequest: createExisting(),
          }),
      );
    });

    test("rejects invalid mode", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              geoSearch: {
                mode: "circle",
                bounds: validBounds,
              },
            },
            clientRequest: createExisting(),
          }),
      );
    });

    test("strips unused nearby fields when storing area mode", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          geoSearch: {
            mode: GEO_SEARCH_MODES.AREA,
            bounds: otherBounds,
            position: validPosition,
            radiusMeters: 500,
            placeName: "Asoke",
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update.geoSearch, {
        mode: GEO_SEARCH_MODES.AREA,
        bounds: otherBounds,
        placeName: "Asoke",
      });
      assert.equal(Object.hasOwn(update.geoSearch, "position"), false);
      assert.equal(Object.hasOwn(update.geoSearch, "radiusMeters"), false);
    });
  });

  describe("filters", () => {
    test("replaces filters with a sparse object", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          filters: {
            minRent: 18_000,
            bedroomCount: 2,
          },
        },
        clientRequest: createExisting(),
      });

      assert.equal(update.filters.minRent, 18_000);
      assert.equal(update.filters.bedroomCount, 2);
      assert.equal(update.filters.maxRent, undefined);
      assert.equal(update.filters.isForeignerAccepted, undefined);
    });

    test("clears filters when empty object is sent", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: { filters: {} },
        clientRequest: createExisting(),
      });

      assert.deepEqual(update, { filters: {} });
    });

    test("treats equivalent filters as no change when agentProfileIds are strings", () => {
      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            filters: {
              minRent: 15_000,
              maxRent: 35_000,
              isForeignerAccepted: true,
              agentProfileIds: [agentProfileId.toString()],
            },
          },
          clientRequest: createExisting(),
        }),
      );
    });

    test("ignores empty mongoose array fields when comparing filters", () => {
      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            filters: {
              minRent: 15_000,
              maxRent: 35_000,
              isForeignerAccepted: true,
              agentProfileIds: [agentProfileId.toString()],
            },
          },
          clientRequest: createExisting({
            filters: {
              minRent: 15_000,
              maxRent: 35_000,
              isForeignerAccepted: true,
              agentProfileIds: [agentProfileId],
              listingFacilities: [],
              buildingFacilities: [],
              security: [],
              supportLanguages: [],
            },
          }),
        }),
      );
    });

    test("detects agentProfileIds membership changes", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          filters: {
            minRent: 15_000,
            maxRent: 35_000,
            isForeignerAccepted: true,
            agentProfileIds: [
              agentProfileId.toString(),
              secondAgentProfileId.toString(),
            ],
          },
        },
        clientRequest: createExisting(),
      });

      assert.equal(update.filters.agentProfileIds.length, 2);
      assert.equal(
        String(update.filters.agentProfileIds[1]),
        secondAgentProfileId.toString(),
      );
    });

    test("normalizes legacy listerIds into agentProfileIds", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          filters: {
            listerIds: [secondAgentProfileId.toString()],
          },
        },
        clientRequest: createExisting(),
      });

      assert.equal(update.filters.agentProfileIds.length, 1);
      assert.equal(
        String(update.filters.agentProfileIds[0]),
        secondAgentProfileId.toString(),
      );
      assert.equal(Object.hasOwn(update.filters, "listerIds"), false);
    });

    test("rejects using both agentProfileIds and listerIds", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              filters: {
                agentProfileIds: [agentProfileId.toString()],
                listerIds: [secondAgentProfileId.toString()],
              },
            },
            clientRequest: createExisting(),
          }),
        "Use either agentProfileIds or listerIds, not both",
      );
    });

    test("rejects maxRent less than minRent", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: {
              filters: {
                minRent: 5000,
                maxRent: 1000,
              },
            },
            clientRequest: createExisting(),
          }),
        "maxRent must be greater than or equal to minRent",
      );
    });

    test("rejects non-object filters", () => {
      assertValidationError(
        () =>
          buildOwnerUpdateClientRequestRecord({
            body: { filters: "cheap" },
            clientRequest: createExisting(),
          }),
        "filters must be an object",
      );
    });

    test("updates availableBy date and compares equal calendar dates as no change", () => {
      const withDate = createExisting({
        filters: {
          availableBy: availableByDate,
        },
      });

      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          filters: {
            availableBy: "2026-10-01",
          },
        },
        clientRequest: withDate,
      });

      assert.equal(update.filters.availableBy instanceof Date, true);
      assert.deepEqual(
        update.filters.availableBy,
        validateAvailableBy("2026-10-01"),
      );

      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            filters: {
              availableBy: "2026-09-01",
            },
          },
          clientRequest: withDate,
        }),
      );

      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            filters: {
              availableBy: availableByDate.toISOString(),
            },
          },
          clientRequest: withDate,
        }),
      );
    });

    test("supports building and listing filter fields", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          filters: {
            buildingType: "Condo",
            kitchenType: "Kitchen",
            listingFacilities: ["Wifi", "Air Conditioner"],
            buildingFacilities: ["Swimming Pool"],
            isPetAllowed: true,
          },
        },
        clientRequest: createExisting(),
      });

      assert.equal(update.filters.buildingType, "Condo");
      assert.equal(update.filters.kitchenType, "Kitchen");
      assert.deepEqual(update.filters.listingFacilities, [
        "Wifi",
        "Air Conditioner",
      ]);
      assert.deepEqual(update.filters.buildingFacilities, ["Swimming Pool"]);
      assert.equal(update.filters.isPetAllowed, true);
    });
  });

  describe("partial updates and change detection", () => {
    test("includes only fields that actually changed", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          name: "  Sukhumvit 2BR  ",
          description: "Changed description",
          geoSearch: {
            mode: GEO_SEARCH_MODES.AREA,
            bounds: validBounds,
            placeName: "Phrom Phong",
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(Object.keys(update).sort(), ["description"]);
      assert.equal(update.description, "Changed description");
    });

    test("can update all editable fields together", () => {
      const update = buildOwnerUpdateClientRequestRecord({
        body: {
          name: "All fields",
          description: null,
          geoSearch: {
            mode: GEO_SEARCH_MODES.NEARBY,
            position: validPosition,
            radiusMeters: 300,
          },
          filters: {
            minRent: 20_000,
          },
        },
        clientRequest: createExisting(),
      });

      assert.deepEqual(Object.keys(update).sort(), [
        "description",
        "filters",
        "geoSearch",
        "name",
      ]);
    });

    test("rejects when every provided field is unchanged", () => {
      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            name: "Sukhumvit 2BR",
            description: "Near BTS",
            geoSearch: {
              mode: GEO_SEARCH_MODES.AREA,
              bounds: validBounds,
              placeName: "Phrom Phong",
            },
            filters: {
              minRent: 15_000,
              maxRent: 35_000,
              isForeignerAccepted: true,
              agentProfileIds: [agentProfileId.toString()],
            },
          },
          clientRequest: createExisting(),
        }),
      );
    });
  });

  describe("mongoose document shapes", () => {
    test("reads nested values via toObject when present", () => {
      const existing = createExisting({
        geoSearch: {
          toObject() {
            return {
              mode: GEO_SEARCH_MODES.AREA,
              bounds: validBounds,
              placeName: "Phrom Phong",
            };
          },
        },
        filters: {
          toObject() {
            return {
              minRent: 15_000,
              maxRent: 35_000,
              isForeignerAccepted: true,
              agentProfileIds: [agentProfileId],
            };
          },
        },
      });

      assertNoValidChange(() =>
        buildOwnerUpdateClientRequestRecord({
          body: {
            geoSearch: {
              mode: GEO_SEARCH_MODES.AREA,
              bounds: validBounds,
              placeName: "Phrom Phong",
            },
            filters: {
              minRent: 15_000,
              maxRent: 35_000,
              isForeignerAccepted: true,
              agentProfileIds: [agentProfileId.toString()],
            },
          },
          clientRequest: existing,
        }),
      );

      const update = buildOwnerUpdateClientRequestRecord({
        body: { name: "From mongoose shape" },
        clientRequest: existing,
      });

      assert.deepEqual(update, { name: "From mongoose shape" });
    });
  });
});
