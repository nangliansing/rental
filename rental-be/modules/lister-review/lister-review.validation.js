import {
  validateAdminReason,
  validateEnumValue,
  validateIntegerRange,
  validateLimit,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validatePage,
  validateStringArray,
} from "../../shared/validators/index.js";

import {
  LISTER_REVIEW_SORTS,
  LISTER_REVIEW_TAGS,
} from "./lister-review.constants.js";

export const validateAdminDeleteListerReviewBody = (body) => {
  validateObject(body, "body");

  return {
    reason: validateAdminReason(body.reason),
  };
};

export const validateListerReviewListerProfileId = (input) => {
  return validateMongooseId(input, "listerProfileId", {
    asObjectId: true,
  });
};

export const validateListerReviewId = (input) => {
  return validateMongooseId(input, "reviewId", {
    asObjectId: true,
  });
};

export const validateListerReviewRelatedListingId = (input) => {
  if (input == null) return null;

  return validateMongooseId(input, "relatedListingId", {
    asObjectId: true,
  });
};

export const validateListerReviewRelatedBuildingId = (input) => {
  if (input == null) return null;

  return validateMongooseId(input, "relatedBuildingId", {
    asObjectId: true,
  });
};

export const validateListerReviewRating = (input) => {
  return validateIntegerRange(input, "rating", 1, 5);
};

export const validateListerReviewTags = (input) => {
  return validateStringArray(input, "tags", Object.values(LISTER_REVIEW_TAGS));
};

export const validateListerReviewComment = (input) => {
  return validateOptionalString(input, "comment", 1200);
};

export const validateCreateListerReviewBody = (body) => {
  validateObject(body, "body");

  return {
    rating: validateListerReviewRating(body.rating),
    tags: validateListerReviewTags(body.tags),
    comment: validateListerReviewComment(body.comment),
    relatedListingId: validateListerReviewRelatedListingId(
      body.relatedListingId,
    ),
    relatedBuildingId: validateListerReviewRelatedBuildingId(
      body.relatedBuildingId,
    ),
  };
};

export const validateUpdateListerReviewBody = (body) => {
  validateObject(body, "body");

  return {
    rating:
      body.rating === undefined
        ? undefined
        : validateListerReviewRating(body.rating),
    tags:
      body.tags === undefined ? undefined : validateListerReviewTags(body.tags),
    comment:
      body.comment === undefined
        ? undefined
        : validateListerReviewComment(body.comment),
    relatedListingId:
      body.relatedListingId === undefined
        ? undefined
        : validateListerReviewRelatedListingId(body.relatedListingId),
    relatedBuildingId:
      body.relatedBuildingId === undefined
        ? undefined
        : validateListerReviewRelatedBuildingId(body.relatedBuildingId),
  };
};

export const validateSearchListerReviewsQuery = (queryInput = {}) => {
  validateObject(queryInput, "query");

  return {
    page: validatePage(queryInput.page),
    limit: validateLimit(queryInput.limit),
    sort: validateEnumValue(
      queryInput.sort,
      "sort",
      Object.values(LISTER_REVIEW_SORTS),
      LISTER_REVIEW_SORTS.LATEST,
    ),
  };
};
