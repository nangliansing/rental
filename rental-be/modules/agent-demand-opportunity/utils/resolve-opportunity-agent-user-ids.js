import AgentProfile from "../../agent/agent-profile.model.js";

const collectDistinctAgentProfileIds = (opportunities) => [
  ...new Set(
    opportunities.flatMap((opportunity) =>
      (opportunity.filters?.agentProfileIds ?? []).map(String),
    ),
  ),
];

export const resolveOpportunityAgentUserIds = async ({
  opportunities,
  session = null,
}) => {
  const profileIds = collectDistinctAgentProfileIds(opportunities);
  if (profileIds.length === 0) return new Map();

  let query = AgentProfile.find({
    _id: { $in: profileIds },
    isDeleted: { $ne: true },
  })
    .select("_id userId")
    .lean();

  if (session) query = query.session(session);
  const profiles = await query;

  return new Map(
    profiles.map((profile) => [String(profile._id), profile.userId]),
  );
};

export const getOpportunityListedByUserIds = (
  opportunity,
  agentUserIdsByProfileId,
) => {
  const profileIds = opportunity.filters?.agentProfileIds;
  if (profileIds === undefined || profileIds.length === 0) return undefined;

  return profileIds
    .map((profileId) => agentUserIdsByProfileId.get(String(profileId)))
    .filter(Boolean);
};
