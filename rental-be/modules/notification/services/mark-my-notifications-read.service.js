import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import Notification from "../notification.model.js";

export const markMyNotificationsReadService = async (
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const recipient = validateMongooseId(actorId, "recipient", {
    asObjectId: true,
  });
  const now = new Date();

  const update = {
    $set: {
      isRead: true,
      readAt: now,
    },
  };

  const updateOptions = {
    runValidators: true,
    ...(session ? { session } : {}),
  };

  const result = await Notification.updateMany(
    {
      recipient,
      isRead: false,
      expiresAt: { $gt: now },
    },
    update,
    updateOptions,
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};
