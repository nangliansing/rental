import { AppError } from "../../shared/errors/app-error.js";
import {
  validateCoordinates,
  validateIntegerRange,
  validateLimit,
  validateLineGeometry,
  validateObject,
  validatePage,
  validatePolygonGeometry,
} from "../../shared/validators/index.js";

import {
  DEMAND_OPPORTUNITY_MAX_COVERAGE_METERS,
  DEMAND_OPPORTUNITY_MIN_COVERAGE_METERS,
  DEMAND_OPPORTUNITY_MATCH_STATUSES,
} from "./agent-demand-opportunity.constants.js";

const rejectUnknownFields = (input, allowedFields, fieldName) => {
  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length) {
    throw new AppError(
      `Unknown ${fieldName} fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }
};

const validateCoverageMeters = (input) =>
  validateIntegerRange(
    input,
    "area.coverageMeters",
    DEMAND_OPPORTUNITY_MIN_COVERAGE_METERS,
    DEMAND_OPPORTUNITY_MAX_COVERAGE_METERS,
  );

const validateMatchStatus = (input) => {
  if (input === undefined) return undefined;
  if (!Object.values(DEMAND_OPPORTUNITY_MATCH_STATUSES).includes(input)) {
    throw new AppError(
      "matchStatus must be matched or unmatched",
      422,
      "VALIDATION_ERROR",
    );
  }
  return input;
};

export const validateDemandOpportunityArea = (input) => {
  const area = validateObject(input, "area");

  if (["Polygon", "MultiPolygon"].includes(area.type)) {
    rejectUnknownFields(area, ["type", "coordinates"], "area");
    return validatePolygonGeometry(area, "area");
  }

  if (["LineString", "MultiLineString"].includes(area.type)) {
    rejectUnknownFields(
      area,
      ["type", "coordinates", "coverageMeters"],
      "area",
    );

    return {
      ...validateLineGeometry(
        { type: area.type, coordinates: area.coordinates },
        "area",
      ),
      coverageMeters: validateCoverageMeters(area.coverageMeters),
    };
  }

  if (area.type === "Point") {
    rejectUnknownFields(
      area,
      ["type", "coordinates", "coverageMeters"],
      "area",
    );

    return {
      type: "Point",
      coordinates: validateCoordinates(area.coordinates, "area.coordinates"),
      coverageMeters: validateCoverageMeters(area.coverageMeters),
    };
  }

  throw new AppError(
    "area.type must be Point, LineString, MultiLineString, Polygon, or MultiPolygon",
    422,
    "VALIDATION_ERROR",
  );
};

export const validateSearchAgentDemandOpportunitiesBody = (input) => {
  const body = validateObject(input, "body");
  rejectUnknownFields(body, ["area", "pagination", "matchStatus"], "body");

  if (body.area == null) {
    throw new AppError("area is required", 422, "VALIDATION_ERROR");
  }

  if (body.pagination == null) {
    throw new AppError("pagination is required", 422, "VALIDATION_ERROR");
  }

  const pagination = validateObject(body.pagination, "pagination");
  rejectUnknownFields(pagination, ["page", "limit"], "pagination");

  if (pagination.page == null || pagination.limit == null) {
    throw new AppError(
      "pagination.page and pagination.limit are required",
      422,
      "VALIDATION_ERROR",
    );
  }

  const matchStatus = validateMatchStatus(body.matchStatus);

  return {
    area: validateDemandOpportunityArea(body.area),
    page: validatePage(pagination.page),
    limit: validateLimit(pagination.limit),
    ...(matchStatus === undefined ? {} : { matchStatus }),
  };
};
