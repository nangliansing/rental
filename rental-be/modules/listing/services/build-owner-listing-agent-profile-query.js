import AgentProfile from "../../agent/agent-profile.model.js";

const OWNER_LISTING_AGENT_PROFILE_SELECT =
  "userId isOnline displayName profilePhoto description phone lineUrl whatsappPhone telegramUrl viberPhone supportLanguages reviewSummary isVerified";

export const buildOwnerListingAgentProfileQuery = ({
  userId,
  session = null,
}) => {
  let query = AgentProfile.findOne({ userId, isDeleted: false })
    .select(OWNER_LISTING_AGENT_PROFILE_SELECT)
    .lean();

  if (session) {
    query = query.session(session);
  }

  return query;
};
