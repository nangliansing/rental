import AgentProfile from "../../agent/agent-profile.model.js";
import User from "../../user/user.model.js";
import { USER_STATUSES } from "../../user/user.constants.js";

export const resolveAgentProfileUserIds = async (
  agentProfileIds = [],
  session = null
) => {
  if (agentProfileIds.length === 0) return [];

  let profileQuery = AgentProfile.find({
    _id: { $in: agentProfileIds },
    isDeleted: { $ne: true },
  }).select("userId");

  if (session) {
    profileQuery = profileQuery.session(session);
  }

  const profiles = await profileQuery;
  const profileUserIds = profiles.map((profile) => profile.userId);

  if (profileUserIds.length === 0) return [];

  let userQuery = User.find({
    _id: { $in: profileUserIds },
    status: USER_STATUSES.ACTIVE,
  }).select("_id");

  if (session) {
    userQuery = userQuery.session(session);
  }

  const users = await userQuery;

  return users.map((user) => user._id);
};
