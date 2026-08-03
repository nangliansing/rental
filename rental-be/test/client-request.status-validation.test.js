import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import { CLIENT_REQUEST_STATUSES } from "../modules/client-request/client-request.constants.js";
import { validateClientRequestStatus } from "../modules/client-request/client-request.validation.js";

const assertValidationError = (fn, messageMatcher = null) => {
  assert.throws(fn, (error) => {
    if (!(error instanceof AppError)) return false;
    if (error.statusCode !== 422) return false;
    if (error.code !== "VALIDATION_ERROR") return false;
    if (messageMatcher == null) return true;
    if (typeof messageMatcher === "string") {
      return error.message === messageMatcher;
    }
    return messageMatcher.test(error.message);
  });
};

test("validateClientRequestStatus accepts Waiting and Closed", () => {
  assert.equal(
    validateClientRequestStatus(CLIENT_REQUEST_STATUSES.WAITING),
    CLIENT_REQUEST_STATUSES.WAITING,
  );
  assert.equal(
    validateClientRequestStatus(CLIENT_REQUEST_STATUSES.CLOSED),
    CLIENT_REQUEST_STATUSES.CLOSED,
  );
  assert.equal(validateClientRequestStatus("  Waiting  "), "Waiting");
  assert.equal(validateClientRequestStatus("  Closed  "), "Closed");
});

test("validateClientRequestStatus returns null when omitted", () => {
  assert.equal(validateClientRequestStatus(undefined), null);
  assert.equal(validateClientRequestStatus(null), null);
});

test("validateClientRequestStatus rejects invalid values", () => {
  for (const status of ["", "waiting", "WAITING", "Open", 1, {}, []]) {
    assertValidationError(() => validateClientRequestStatus(status));
  }
});
