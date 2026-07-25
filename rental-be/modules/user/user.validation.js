import {
  validateRequiredString,
  validateEmail,
  validateEnumValue,
  validatePassword as validatePasswordValue,
  validateLimit,
  validateMongooseId,
  validateObject,
  validatePage,
} from "../../shared/validators/index.js";

import {
  USER_ROLES,
  USER_STATUSES,
  AUTH_PROVIDERS,
} from "./user.constants.js";

export const validateName = (input) => {
  return validateRequiredString(input, "name", 255);
};

export const validateUserEmail = (input) => {
  return validateEmail(input, "email");
};

export const validateUserId = (input) => {
  return validateMongooseId(input, "userId", {
    asObjectId: true,
  });
};

export const validateRequiredUserPassword = (input) => {
  return validatePasswordValue(input, "password", {
    required: true,
    min: 8,
    max: 72,
  });
};

export const validateOptionalUserPassword = (input) => {
  return validatePasswordValue(input, "password", {
    required: false,
    min: 8,
    max: 72,
  });
};

export const validateAuthProvider = (input) => {
  return validateEnumValue(
    input,
    "authProvider",
    Object.values(AUTH_PROVIDERS),
    AUTH_PROVIDERS.PASSWORD
  );
};

export const validateRole = (input) => {
  return validateEnumValue(
    input,
    "role",
    Object.values(USER_ROLES),
    USER_ROLES.USER
  );
};

export const validateStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(USER_STATUSES),
    USER_STATUSES.ACTIVE
  );
};

export const validateSearchPlatformAdminsQuery = (input) => {
  validateObject(input, "query");

  return {
    page: validatePage(input.page),
    limit: validateLimit(input.limit),
  };
};
