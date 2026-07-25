import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import PendingPost from "../pending-post.model.js";

export const ownerDeletePendingPostService = async ({
  pendingPostId,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedPendingPostId = validateMongooseId(
    pendingPostId,
    "pendingPostId",
    { asObjectId: true },
  );
  const submittedBy = validateMongooseId(actorId, "submittedBy", {
    asObjectId: true,
  });
  const deletedAt = new Date();

  let pendingPostQuery = PendingPost.findOneAndUpdate(
    {
      _id: validatedPendingPostId,
      submittedBy,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isDeleted: true,
        deletedAt,
        deletedBy: submittedBy,
        deleteReason: null,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      ...(session ? { session } : {}),
    },
  );

  const pendingPost = await pendingPostQuery;

  if (!pendingPost) {
    throw new AppError(
      "Pending post not found",
      404,
      "PENDING_POST_NOT_FOUND",
    );
  }

  return pendingPost;
};
