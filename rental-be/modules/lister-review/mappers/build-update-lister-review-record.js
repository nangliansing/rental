import { AppError } from "../../../shared/errors/app-error.js";

import { validateUpdateListerReviewBody } from "../lister-review.validation.js";

const normalizeId = (value) => {
  return value ? value.toString() : null;
};

const normalizeTags = (tags) => {
  return [...tags].sort();
};

const areTagsEqual = (left, right) => {
  const normalizedLeft = normalizeTags(left);
  const normalizedRight = normalizeTags(right);

  if (normalizedLeft.length !== normalizedRight.length) return false;

  return normalizedLeft.every((tag, index) => tag === normalizedRight[index]);
};

const assignIfChanged = (updates, fieldName, nextValue, currentValue) => {
  if (nextValue === undefined) return;

  if (nextValue !== currentValue) {
    updates[fieldName] = nextValue;
  }
};

export const buildUpdateListerReviewRecord = ({
  body,
  review,
  relatedBuildingId,
}) => {
  const {
    rating,
    tags,
    comment,
    relatedListingId,
    relatedBuildingId: requestedRelatedBuildingId,
  } = validateUpdateListerReviewBody(body);
  const updates = {};

  assignIfChanged(updates, "rating", rating, review.rating);

  if (tags !== undefined && !areTagsEqual(tags, review.tags ?? [])) {
    updates.tags = tags;
  }

  assignIfChanged(updates, "comment", comment, review.comment ?? null);

  if (
    relatedListingId !== undefined &&
    normalizeId(relatedListingId) !== normalizeId(review.relatedListingId)
  ) {
    updates.relatedListingId = relatedListingId;
  }

  const nextRelatedBuildingId =
    relatedBuildingId === undefined
      ? requestedRelatedBuildingId
      : relatedBuildingId;

  if (
    nextRelatedBuildingId !== undefined &&
    normalizeId(nextRelatedBuildingId) !== normalizeId(review.relatedBuildingId)
  ) {
    updates.relatedBuildingId = nextRelatedBuildingId;
  }

  if (!Object.keys(updates).length) {
    throw new AppError("No valid change", 422, "NO_VALID_CHANGE");
  }

  return {
    ...updates,
    editedAt: new Date(),
  };
};
