// modules/agent/services/owner-delete-agent-profile.service.js
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { AppError } from "../../../shared/errors/app-error.js";
import AgentProfile from "../agent-profile.model.js";

export const ownerDeleteAgentProfileService = async ({
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateMongooseId(actorId, "userId");
  const deletedAt = new Date();

  let agentProfileQuery = AgentProfile.findOneAndUpdate(
    {
      userId,
      isDeleted: false,
    },
    {
      $set: {
        isOnline: false,
        isDeleted: true,
        deletedAt,
        deletedBy: userId,
        deleteReason: null,
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (session) {
    agentProfileQuery = agentProfileQuery.session(session);
  }

  const agentProfile = await agentProfileQuery;

  if (!agentProfile) {
    throw new AppError(
      "Agent profile not found",
      404,
      "AGENT_PROFILE_NOT_FOUND"
    );
  }

  return agentProfile;
};
