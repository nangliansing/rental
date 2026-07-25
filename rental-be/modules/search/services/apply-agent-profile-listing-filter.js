import { resolveAgentProfileUserIds } from "./resolve-agent-profile-user-ids.js";

export const applyAgentProfileListingFilter = async (params, session = null) => {
  const agentProfileIds = params.filters.agent?.agentProfileIds ?? [];

  if (agentProfileIds.length === 0) return params;

  const listedByUserIds = await resolveAgentProfileUserIds(
    agentProfileIds,
    session
  );

  return {
    ...params,
    filters: {
      ...params.filters,
      listing: {
        ...params.filters.listing,
        listedByUserIds,
      },
    },
  };
};
