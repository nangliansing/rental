import { validateObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { validateName, validateProfilePhoto } from "../user.validation.js";

export const buildUpdateCurrentUserRecord = (body) => {
  validateObject(body, "body");

  const update = {};

  if (body.name !== undefined) {
    update.name = validateName(body.name);
  }

  if (body.profilePhoto !== undefined) {
    update.profilePhoto = validateProfilePhoto(body.profilePhoto);
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(
      "No valid fields provided for update",
      422,
      "VALIDATION_ERROR"
    );
  }

  return update;
};
