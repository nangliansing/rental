// modules/search/services/search-agent-profiles.service.js
import { validateNullableObject } from "../../../shared/validators/index.js";

import AgentProfile from "../../agent/agent-profile.model.js";

import { buildSearchAgentProfilesParams } from "../params/index.js";
import { buildSearchAgentProfilesPipeline } from "../pipelines/index.js";

export const searchAgentProfilesService = async ({
    queryInput,
    session = null,
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchAgentProfilesParams(queryInput);
    const pipeline = buildSearchAgentProfilesPipeline(params);

    let query = AgentProfile.aggregate(pipeline);

    if (session) {
        query = query.session(session);
    }

    return query;
};
