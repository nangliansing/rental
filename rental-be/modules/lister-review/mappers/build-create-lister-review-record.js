import { validateCreateListerReviewBody } from "../lister-review.validation.js";

export const buildCreateListerReviewRecord = ({
  body,
  reviewerId,
  listerProfileId,
  relatedBuildingId = null,
}) => {
  const {
    rating,
    tags,
    comment,
    relatedListingId,
    relatedBuildingId: requestedRelatedBuildingId,
  } = validateCreateListerReviewBody(body);

  return {
    reviewerId,
    listerProfileId,
    relatedListingId,
    relatedBuildingId: relatedBuildingId ?? requestedRelatedBuildingId,
    rating,
    tags,
    comment,
    interaction: {
      isVerified: false,
      verifiedBy: null,
      contactEventId: null,
      verifiedAt: null,
    },
    moderation: {
      hiddenBy: null,
      hiddenAt: null,
      hiddenReason: null,
      removedBy: null,
      removedAt: null,
      removedReason: null,
    },
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
  };
};
