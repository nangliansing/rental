import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import { SAVED_SEARCH_STATUSES } from "../modules/saved-search/saved-search.constants.js";
import { validateSavedSearchStatus } from "../modules/saved-search/saved-search.validation.js";

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

test("validateSavedSearchStatus accepts Waiting and Closed", () => {
  assert.equal(
    validateSavedSearchStatus(SAVED_SEARCH_STATUSES.WAITING),
    SAVED_SEARCH_STATUSES.WAITING,
  );
  assert.equal(
    validateSavedSearchStatus(SAVED_SEARCH_STATUSES.CLOSED),
    SAVED_SEARCH_STATUSES.CLOSED,
  );
  assert.equal(validateSavedSearchStatus("  Waiting  "), "Waiting");
  assert.equal(validateSavedSearchStatus("  Closed  "), "Closed");
});

test("validateSavedSearchStatus returns null when omitted", () => {
  assert.equal(validateSavedSearchStatus(undefined), null);
  assert.equal(validateSavedSearchStatus(null), null);
});

test("validateSavedSearchStatus rejects invalid values", () => {
  for (const status of ["", "waiting", "WAITING", "Open", 1, {}, []]) {
    assertValidationError(() => validateSavedSearchStatus(status));
  }
});
