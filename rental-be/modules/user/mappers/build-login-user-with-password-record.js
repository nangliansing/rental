// modules/user/mappers/build-login-user-with-password-record.js
import { validateObject } from "../../../shared/validators/index.js";

import {
  validateUserEmail,
  validateRequiredUserPassword,
} from "../user.validation.js";

export const buildLoginUserWithPasswordRecord = (body) => {
  validateObject(body, "body");

  return {
    email: validateUserEmail(body.email),
    password: validateRequiredUserPassword(body.password),
  };
};