import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import {
  buildSafeUserResponse,
  buildUpdateCurrentUserRecord,
} from "../mappers/index.js";
import { assertActiveUser } from "../utils/index.js";
import User from "../user.model.js";

const throwNoUserChanges = () => {
  throw new AppError(
    "No user changes provided",
    422,
    "VALIDATION_ERROR"
  );
};

const normalizeForCompare = (value) => {
  if (value && typeof value.toObject === "function") {
    return normalizeForCompare(value.toObject());
  }

  if (Array.isArray(value)) {
    return value.map(normalizeForCompare);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((record, key) => {
        record[key] = normalizeForCompare(value[key]);
        return record;
      }, {});
  }

  return value ?? null;
};

const areValuesEqual = (firstValue, secondValue) => {
  return (
    JSON.stringify(normalizeForCompare(firstValue)) ===
    JSON.stringify(normalizeForCompare(secondValue))
  );
};

const assertHasUserChanges = (update, existingUser) => {
  const hasChanges = Object.entries(update).some(([fieldName, value]) => {
    return !areValuesEqual(value, existingUser[fieldName]);
  });

  if (!hasChanges) {
    throwNoUserChanges();
  }
};

export const updateCurrentUserService = async (
  body,
  userId,
  session = null
) => {
  validateNullableObject(session, "session");

  const validatedUserId = validateMongooseId(userId, "userId");
  const update = buildUpdateCurrentUserRecord(body);

  let existingUserQuery = User.findById(validatedUserId).select("-password");

  if (session) {
    existingUserQuery = existingUserQuery.session(session);
  }

  const existingUser = await existingUserQuery;

  assertActiveUser(existingUser);
  assertHasUserChanges(update, existingUser);

  let updateQuery = User.findByIdAndUpdate(
    validatedUserId,
    { $set: update },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-password");

  if (session) {
    updateQuery = updateQuery.session(session);
  }

  const updatedUser = await updateQuery;

  assertActiveUser(updatedUser);

  return buildSafeUserResponse(updatedUser);
};
