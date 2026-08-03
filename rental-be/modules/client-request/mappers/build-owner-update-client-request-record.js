import { isDeepStrictEqual } from "node:util";

import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateObject,
  validateOptionalString,
  validateRequiredString,
} from "../../../shared/validators/index.js";

import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
} from "../client-request.constants.js";
import {
  validateClientRequestFilters,
  validateClientRequestGeoSearch,
} from "../client-request.validation.js";

const OWNER_UPDATE_FIELD_VALIDATORS = Object.freeze({
  name: (input) =>
    validateRequiredString(input, "name", CLIENT_REQUEST_NAME_MAX_LENGTH),
  description: (input) =>
    validateOptionalString(
      input,
      "description",
      CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
    ),
  geoSearch: validateClientRequestGeoSearch,
  filters: validateClientRequestFilters,
});

const toPlainValue = (value) => {
  if (value?.toObject) {
    return value.toObject({ depopulate: true });
  }

  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }

  if (value instanceof Date) {
    return value;
  }

  if (value?.equals && value?._bsontype === "ObjectId") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((record, key) => {
        const nestedValue = value[key];

        if (nestedValue !== undefined) {
          record[key] = toPlainValue(nestedValue);
        }

        return record;
      }, {});
  }

  return value;
};

const normalizeForCompare = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }

    return value.map(normalizeForCompare);
  }

  if (value?.equals && value?._bsontype === "ObjectId") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((record, key) => {
        const nestedValue = normalizeForCompare(value[key]);

        if (nestedValue !== undefined) {
          record[key] = nestedValue;
        }

        return record;
      }, {});
  }

  return value ?? null;
};

export const buildOwnerUpdateClientRequestRecord = ({
  body,
  clientRequest,
}) => {
  const validatedBody = validateObject(body, "body");
  const unknownFields = Object.keys(validatedBody).filter(
    (fieldName) => !Object.hasOwn(OWNER_UPDATE_FIELD_VALIDATORS, fieldName),
  );

  if (unknownFields.length) {
    throw new AppError(
      `Unknown fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const update = {};

  for (const [fieldName, input] of Object.entries(validatedBody)) {
    const nextValue = OWNER_UPDATE_FIELD_VALIDATORS[fieldName](input);
    const currentValue = toPlainValue(clientRequest[fieldName]);

    if (
      !isDeepStrictEqual(
        normalizeForCompare(nextValue),
        normalizeForCompare(currentValue),
      )
    ) {
      update[fieldName] = nextValue;
    }
  }

  if (!Object.keys(update).length) {
    throw new AppError("No valid change", 422, "NO_VALID_CHANGE");
  }

  return update;
};
