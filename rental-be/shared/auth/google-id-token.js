import { OAuth2Client } from "google-auth-library";

import { getEnvironment } from "../../config/index.js";
import { AppError } from "../errors/app-error.js";

const defaultGoogleClient = new OAuth2Client();

const invalidGoogleCredential = () =>
  new AppError(
    "Google sign-in could not be verified",
    401,
    "INVALID_GOOGLE_CREDENTIAL",
  );

const requiredString = (value) => {
  if (typeof value !== "string") {
    throw invalidGoogleCredential();
  }

  const normalized = value.trim();

  if (!normalized) {
    throw invalidGoogleCredential();
  }

  return normalized;
};

const optionalString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
};

export const verifyGoogleIdToken = async (
  credential,
  {
    client = defaultGoogleClient,
    clientIds = getEnvironment().google.clientIds,
  } = {},
) => {
  try {
    const idToken = requiredString(credential);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientIds,
    });
    const payload = ticket?.getPayload?.();

    if (!payload || payload.email_verified !== true) {
      throw invalidGoogleCredential();
    }

    return Object.freeze({
      subject: requiredString(payload.sub),
      email: requiredString(payload.email).toLowerCase(),
      emailVerified: true,
      name: optionalString(payload.name),
      picture: optionalString(payload.picture),
    });
  } catch {
    throw invalidGoogleCredential();
  }
};
