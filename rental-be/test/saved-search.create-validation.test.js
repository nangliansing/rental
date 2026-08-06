import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
  SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
  GEO_SEARCH_MAX_DISTANCE_METERS,
  GEO_SEARCH_MAX_RADIUS_METERS,
  GEO_SEARCH_MIN_DISTANCE_METERS,
  GEO_SEARCH_MIN_RADIUS_METERS,
  GEO_SEARCH_MODES,
} from "../modules/saved-search/saved-search.constants.js";
import { validateCreateSavedSearchBody } from "../modules/saved-search/saved-search.validation.js";

const agentProfileId = new mongoose.Types.ObjectId().toString();
const secondAgentProfileId = new mongoose.Types.ObjectId().toString();

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
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
      [100.7, 13.8],
      [100.8, 13.75],
    ],
  ],
};

const baseAreaBody = {
  name: "Sukhumvit 2BR",
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
  },
};

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

test("validateCreateSavedSearchBody accepts a full area search payload", () => {
  const result = validateCreateSavedSearchBody({
    name: "  Sukhumvit 2BR  ",
    description: "  Near BTS  ",
    geoSearch: {
      mode: "area",
      bounds: validBounds,
      placeName: "  Phrom Phong  ",
      position: validPosition,
      radiusMeters: 500,
      geometry: validLineGeometry,
      distanceMeters: 750,
    },
    filters: {
      minRent: 15_000,
      maxRent: 35_000,
      bedroomCount: 2,
      bathroomCount: 1,
      kitchenType: "Kitchen",
      contractMonths: 6,
      occupancy: 2,
      isForeignerAccepted: true,
      isTM30Provided: true,
      isCookingAllowed: true,
      isPetAllowed: false,
      listingFacilities: ["Air Conditioner"],
      buildingType: "Condo",
      buildingFacilities: ["Parking", "Lift"],
      security: ["CCTV"],
      supportLanguages: ["English", "Thai"],
      agentProfileIds: [agentProfileId],
    },
  });

  assert.equal(result.name, "Sukhumvit 2BR");
  assert.equal(result.description, "Near BTS");
  assert.deepEqual(result.geoSearch, {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  });
  assert.equal(result.filters.minRent, 15_000);
  assert.equal(result.filters.maxRent, 35_000);
  assert.equal(result.filters.bedroomCount, 2);
  assert.equal(result.filters.buildingType, "Condo");
  assert.deepEqual(result.filters.buildingFacilities, ["Parking", "Lift"]);
  assert.deepEqual(result.filters.supportLanguages, ["English", "Thai"]);
  assert.equal(result.filters.agentProfileIds.length, 1);
  assert.equal(String(result.filters.agentProfileIds[0]), agentProfileId);
  assert.equal(result.geoSearch.position, undefined);
  assert.equal(result.geoSearch.radiusMeters, undefined);
  assert.equal(result.geoSearch.geometry, undefined);
  assert.equal(result.geoSearch.distanceMeters, undefined);
});

test("validateCreateSavedSearchBody accepts nearby and line modes", () => {
  const nearby = validateCreateSavedSearchBody({
    name: "Pin search",
    geoSearch: {
      mode: GEO_SEARCH_MODES.NEARBY,
      position: validPosition,
      radiusMeters: 500,
    },
  });

  assert.deepEqual(nearby.geoSearch, {
    mode: GEO_SEARCH_MODES.NEARBY,
    position: validPosition,
    radiusMeters: 500,
    placeName: null,
  });
  assert.deepEqual(nearby.filters, {});
  assert.equal(nearby.description, null);

  const line = validateCreateSavedSearchBody({
    name: "Line search",
    geoSearch: {
      mode: GEO_SEARCH_MODES.LINE,
      geometry: validLineGeometry,
      distanceMeters: 750,
      placeName: null,
    },
    filters: {},
  });

  assert.deepEqual(line.geoSearch, {
    mode: GEO_SEARCH_MODES.LINE,
    geometry: validLineGeometry,
    distanceMeters: 750,
    placeName: null,
  });

  const multiLine = validateCreateSavedSearchBody({
    name: "Multi line",
    geoSearch: {
      mode: "line",
      geometry: validMultiLineGeometry,
      distanceMeters: GEO_SEARCH_MIN_DISTANCE_METERS,
    },
  });

  assert.equal(multiLine.geoSearch.geometry.type, "MultiLineString");
  assert.equal(
    multiLine.geoSearch.distanceMeters,
    GEO_SEARCH_MIN_DISTANCE_METERS,
  );
});

test("validateCreateSavedSearchBody rejects non-object bodies", () => {
  for (const input of [null, undefined, "body", 1, true, []]) {
    assertValidationError(
      () => validateCreateSavedSearchBody(input),
      "body must be an object",
    );
  }
});

test("validateCreateSavedSearchBody requires geoSearch", () => {
  assertValidationError(
    () => validateCreateSavedSearchBody({ name: "Missing geo" }),
    "geoSearch is required",
  );
  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        name: "Null geo",
        geoSearch: null,
      }),
    "geoSearch is required",
  );
});

test("validateCreateSavedSearchBody validates name", () => {
  for (const name of ["", "   ", 123, {}, [], null, undefined]) {
    assertValidationError(() =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        name,
      }),
    );
  }

  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        name: "a".repeat(SAVED_SEARCH_NAME_MAX_LENGTH + 1),
      }),
    `name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters`,
  );

  const atLimit = validateCreateSavedSearchBody({
    ...baseAreaBody,
    name: "a".repeat(SAVED_SEARCH_NAME_MAX_LENGTH),
  });
  assert.equal(atLimit.name.length, SAVED_SEARCH_NAME_MAX_LENGTH);
});

test("validateCreateSavedSearchBody normalizes optional description", () => {
  for (const description of [undefined, null, "", "   "]) {
    const result = validateCreateSavedSearchBody({
      ...baseAreaBody,
      description,
    });
    assert.equal(result.description, null);
  }

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      description: 123,
    }),
  );

  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        description: "a".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH + 1),
      }),
    `description must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters`,
  );
});

test("validateCreateSavedSearchBody validates geoSearch mode", () => {
  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        name: "No mode",
        geoSearch: { bounds: validBounds },
      }),
    "mode is required",
  );

  for (const mode of ["", "map", "AREA", 1, {}, []]) {
    assertValidationError(() =>
      validateCreateSavedSearchBody({
        name: "Bad mode",
        geoSearch: { mode, bounds: validBounds },
      }),
    );
  }
});

test("validateCreateSavedSearchBody validates area bounds", () => {
  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        name: "Area",
        geoSearch: { mode: "area" },
      }),
    "bounds must be an object",
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Area",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 13.75, lng: 100.66 },
          southWest: { lat: 13.78, lng: 100.62 },
        },
      },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Area",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 13.78, lng: 100.62 },
          southWest: { lat: 13.75, lng: 100.66 },
        },
      },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Area",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 91, lng: 100.66 },
          southWest: { lat: 13.75, lng: 100.62 },
        },
      },
    }),
  );
});

test("validateCreateSavedSearchBody validates nearby position and radius", () => {
  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Nearby",
      geoSearch: {
        mode: "nearby",
        radiusMeters: 500,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Nearby",
      geoSearch: {
        mode: "nearby",
        position: validPosition,
      },
    }),
  );

  for (const position of [
    { lat: 91, lng: 100 },
    { lat: 13, lng: 181 },
    { lat: "13", lng: 100 },
    { lat: 13 },
    null,
  ]) {
    assertValidationError(() =>
      validateCreateSavedSearchBody({
        name: "Nearby",
        geoSearch: {
          mode: "nearby",
          position,
          radiusMeters: 500,
        },
      }),
    );
  }

  for (const radiusMeters of [
    GEO_SEARCH_MIN_RADIUS_METERS - 1,
    GEO_SEARCH_MAX_RADIUS_METERS + 1,
    1.5,
    "500",
    null,
  ]) {
    assertValidationError(() =>
      validateCreateSavedSearchBody({
        name: "Nearby",
        geoSearch: {
          mode: "nearby",
          position: validPosition,
          radiusMeters,
        },
      }),
    );
  }

  const atLimits = validateCreateSavedSearchBody({
    name: "Nearby limits",
    geoSearch: {
      mode: "nearby",
      position: validPosition,
      radiusMeters: GEO_SEARCH_MAX_RADIUS_METERS,
    },
  });
  assert.equal(atLimits.geoSearch.radiusMeters, GEO_SEARCH_MAX_RADIUS_METERS);
});

test("validateCreateSavedSearchBody validates line geometry and distance", () => {
  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        distanceMeters: 500,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: validLineGeometry,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: {
          type: "LineString",
          coordinates: [[100.6, 13.7]],
        },
        distanceMeters: 500,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: {
          type: "Point",
          coordinates: [100.6, 13.7],
        },
        distanceMeters: 500,
      },
    }),
  );

  for (const distanceMeters of [
    GEO_SEARCH_MIN_DISTANCE_METERS - 1,
    GEO_SEARCH_MAX_DISTANCE_METERS + 1,
    12.5,
    null,
  ]) {
    assertValidationError(() =>
      validateCreateSavedSearchBody({
        name: "Line",
        geoSearch: {
          mode: "line",
          geometry: validLineGeometry,
          distanceMeters,
        },
      }),
    );
  }
});

test("validateCreateSavedSearchBody validates placeName", () => {
  const blank = validateCreateSavedSearchBody({
    ...baseAreaBody,
    geoSearch: {
      ...baseAreaBody.geoSearch,
      placeName: "   ",
    },
  });
  assert.equal(blank.geoSearch.placeName, null);

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      geoSearch: {
        ...baseAreaBody.geoSearch,
        placeName: 123,
      },
    }),
  );

  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        geoSearch: {
          ...baseAreaBody.geoSearch,
          placeName: "a".repeat(SAVED_SEARCH_PLACE_NAME_MAX_LENGTH + 1),
        },
      }),
    `placeName must be at most ${SAVED_SEARCH_PLACE_NAME_MAX_LENGTH} characters`,
  );
});

test("validateCreateSavedSearchBody validates filters object and rent range", () => {
  const omittedFilters = validateCreateSavedSearchBody(baseAreaBody);
  assert.deepEqual(omittedFilters.filters, {});

  // null/undefined are treated as empty filters at the create boundary
  for (const filters of [null, undefined]) {
    const result = validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters,
    });
    assert.deepEqual(result.filters, {});
  }

  for (const filters of ["filters", 1, []]) {
    assertValidationError(() =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        filters,
      }),
    );
  }

  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        filters: { minRent: 5000, maxRent: 1000 },
      }),
    "maxRent must be greater than or equal to minRent",
  );

  const equalRent = validateCreateSavedSearchBody({
    ...baseAreaBody,
    filters: { minRent: 5000, maxRent: 5000 },
  });
  assert.equal(equalRent.filters.minRent, 5000);
  assert.equal(equalRent.filters.maxRent, 5000);
});

test("validateCreateSavedSearchBody validates agent profile id filters", () => {
  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        filters: {
          agentProfileIds: [agentProfileId],
          listerIds: [secondAgentProfileId],
        },
      }),
    "Use either agentProfileIds or listerIds, not both",
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters: { agentProfileIds: ["not-an-id"] },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters: { agentProfileIds: agentProfileId },
    }),
  );

  const fromListerIds = validateCreateSavedSearchBody({
    ...baseAreaBody,
    filters: { listerIds: [agentProfileId, agentProfileId] },
  });
  assert.equal(fromListerIds.filters.agentProfileIds.length, 1);
  assert.equal(String(fromListerIds.filters.agentProfileIds[0]), agentProfileId);
  assert.equal(fromListerIds.filters.listerIds, undefined);

  const emptyArraysOmitted = validateCreateSavedSearchBody({
    ...baseAreaBody,
    filters: {
      agentProfileIds: [],
      listingFacilities: [],
      buildingFacilities: [],
      security: [],
    },
  });
  assert.deepEqual(emptyArraysOmitted.filters, {});

  // Empty supportLanguages is rejected by shared agent validation (search reuse).
  assertValidationError(
    () =>
      validateCreateSavedSearchBody({
        ...baseAreaBody,
        filters: { supportLanguages: [] },
      }),
    "supportLanguages must contain at least one language",
  );
});

test("validateCreateSavedSearchBody rejects invalid filter enums and types", () => {
  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters: { buildingType: "Tower" },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters: { kitchenType: "Open Kitchen" },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters: { isForeignerAccepted: "yes" },
    }),
  );

  assertValidationError(() =>
    validateCreateSavedSearchBody({
      ...baseAreaBody,
      filters: { bedroomCount: -1 },
    }),
  );
});
