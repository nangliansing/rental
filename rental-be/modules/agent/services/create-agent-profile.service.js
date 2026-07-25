// modules/agent/services/create-agent-profile.service.js
import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { buildCreateAgentProfileRecord } from "../mappers/index.js";
import AgentProfile from "../agent-profile.model.js";

const throwAgentProfileAlreadyExists = () => {
    throw new AppError(
        "Agent profile already exists for this user",
        409,
        "AGENT_PROFILE_ALREADY_EXISTS"
    );
};

export const createAgentProfileService = async (
    body,
    actorId,
    session = null
) => {
    validateNullableObject(session, "session");

    const record = buildCreateAgentProfileRecord(body, actorId);

    let existingProfileQuery = AgentProfile.exists({ userId: record.userId });

    if (session) {
        existingProfileQuery = existingProfileQuery.session(session);
    }

    const existingProfile = await existingProfileQuery;

    if (existingProfile) {
        throwAgentProfileAlreadyExists();
    }

    try {
        const [agentProfile] = await AgentProfile.create(
            [record],
            session ? { session } : undefined
        );

        return agentProfile;
    } catch (error) {
        if (error?.code === 11000) {
            throwAgentProfileAlreadyExists();
        }

        throw error;
    }
};
