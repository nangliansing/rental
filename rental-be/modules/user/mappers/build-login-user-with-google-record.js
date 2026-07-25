import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateObject,
  validateRequiredString,
} from "../../../shared/validators/index.js";

const ALLOWED_FIELDS = new Set(["credential"]);
const MAX_GOOGLE_CREDENTIAL_LENGTH = 10_000;

export const buildLoginUserWithGoogleRecord = (body) => {
  const validatedBody = validateObject(body, "body");
  const unknownFields = Object.keys(validatedBody).filter(
    (field) => !ALLOWED_FIELDS.has(field),
  );

  if (unknownFields.length > 0) {
    throw new AppError(
      `Unknown fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (!("credential" in validatedBody)) {
    throw new AppError(
      "credential is required",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    credential: validateRequiredString(
      validatedBody.credential,
      "credential",
      MAX_GOOGLE_CREDENTIAL_LENGTH,
    ),
  };
};
