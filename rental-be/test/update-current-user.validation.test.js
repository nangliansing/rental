import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import { buildSafeUserResponse } from "../modules/user/mappers/build-safe-user-response.js";
import { buildUpdateCurrentUserRecord } from "../modules/user/mappers/build-update-current-user-record.js";

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
};

test("buildUpdateCurrentUserRecord accepts name and profilePhoto", () => {
  const update = buildUpdateCurrentUserRecord({
    name: "  Trimmed Name  ",
    profilePhoto: sampleProfilePhoto,
  });

  assert.deepEqual(update, {
    name: "Trimmed Name",
    profilePhoto: {
      publicId: "users/test-photo",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      resourceType: "image",
      format: null,
      width: null,
      height: null,
      bytes: null,
      position: 0,
      alt: null,
      isCover: false,
    },
  });
});

test("buildUpdateCurrentUserRecord clears profilePhoto with null", () => {
  const update = buildUpdateCurrentUserRecord({ profilePhoto: null });

  assert.equal(update.profilePhoto, null);
  assert.equal(update.name, undefined);
});

test("buildUpdateCurrentUserRecord rejects empty body", () => {
  assert.throws(
    () => buildUpdateCurrentUserRecord({}),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      /No valid fields provided for update/.test(error.message),
  );
});

test("buildUpdateCurrentUserRecord rejects null body", () => {
  assert.throws(
    () => buildUpdateCurrentUserRecord(null),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      error.message === "body must be an object",
  );
});

test("buildUpdateCurrentUserRecord rejects invalid name values", () => {
  for (const input of ["", "   ", 123, {}, []]) {
    assert.throws(
      () => buildUpdateCurrentUserRecord({ name: input }),
      (error) => error instanceof AppError && error.statusCode === 422,
    );
  }
});

test("buildUpdateCurrentUserRecord rejects name longer than 255 characters", () => {
  assert.throws(
    () => buildUpdateCurrentUserRecord({ name: "a".repeat(256) }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      error.message === "name must be at most 255 characters",
  );
});

test("buildUpdateCurrentUserRecord rejects invalid profilePhoto shape", () => {
  assert.throws(
    () =>
      buildUpdateCurrentUserRecord({
        profilePhoto: { secureUrl: "https://example.com/photo.jpg" },
      }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      /profilePhoto\.publicId must be a string/.test(error.message),
  );
});

test("buildSafeUserResponse omits password and normalizes profilePhoto", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const updatedAt = new Date("2026-01-02T00:00:00.000Z");

  const response = buildSafeUserResponse({
    _id: "507f1f77bcf86cd799439011",
    name: "Safe User",
    email: "safe.user@example.com",
    password: "secret",
    profilePhoto: undefined,
    authProvider: "PASSWORD",
    role: "USER",
    status: "ACTIVE",
    createdAt,
    updatedAt,
  });

  assert.deepEqual(response, {
    _id: "507f1f77bcf86cd799439011",
    name: "Safe User",
    email: "safe.user@example.com",
    profilePhoto: null,
    authProvider: "PASSWORD",
    role: "USER",
    status: "ACTIVE",
    createdAt,
    updatedAt,
  });
  assert.equal(response.password, undefined);
});
