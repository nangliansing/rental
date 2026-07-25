// modules/user/mappers/build-create-user-with-password-record.js
import { validateObject } from "../../../shared/validators/index.js";

import {
  AUTH_PROVIDERS,
  USER_ROLES,
  USER_STATUSES,
} from "../user.constants.js";

import {
  validateName,
  validateUserEmail,
  validateRequiredUserPassword,
} from "../user.validation.js";

export const buildCreateUserWithPasswordRecord = (body) => {
  validateObject(body, "body");

  return {
    name: validateName(body.name),
    email: validateUserEmail(body.email),
    password: validateRequiredUserPassword(body.password),
    authProvider: AUTH_PROVIDERS.PASSWORD,
    role: USER_ROLES.USER,
    status: USER_STATUSES.ACTIVE,
  };
};