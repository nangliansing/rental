// modules/search/services/search-listings-by-agent.service.js
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import AgentProfile from "../../agent/agent-profile.model.js";
import Listing from "../../listing/listing.model.js";
import { serializeListingPayloadForApi } from "../../listing/utils/index.js";
import User from "../../user/user.model.js";
import { USER_STATUSES } from "../../user/user.constants.js";

import { buildSearchListingsByAgentParams } from "../params/index.js";
import { buildSearchListingsByAgentPipeline } from "../pipelines/index.js";
import { normalizeOptionalViewerId } from "./normalize-optional-viewer-id.js";

const AGENT_PROFILE_PUBLIC_FIELDS =
    "isOnline displayName profilePhoto description phone lineUrl whatsappPhone telegramUrl viberPhone supportLanguages isVerified createdAt userId";

export const searchListingsByAgentService = async ({
    paramsInput,
    queryInput,
    viewerUserId = null,
    session = null,
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchListingsByAgentParams(paramsInput, queryInput);

    let agentProfileQuery = AgentProfile.findOne({
        _id: params.agentProfileId,
        isDeleted: { $ne: true },
    }).select(AGENT_PROFILE_PUBLIC_FIELDS);

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

    let userQuery = User.findOne({
        _id: agentProfile.userId,
        status: USER_STATUSES.ACTIVE,
    }).select("_id");

    if (session) {
        userQuery = userQuery.session(session);
    }

    const user = await userQuery;

    if (!user) {
        throw new AppError(
            "Agent profile not found",
            404,
            "AGENT_PROFILE_NOT_FOUND"
        );
    }

    const pipeline = buildSearchListingsByAgentPipeline({
        agentUserId: agentProfile.userId,
        page: params.page,
        limit: params.limit,
        filter: params.filter,
        sort: params.sort,
        viewerUserId: normalizeOptionalViewerId(viewerUserId),
    });

    let listingsQuery = Listing.aggregate(pipeline);

    if (session) {
        listingsQuery = listingsQuery.session(session);
    }

    const [result] = await listingsQuery;

    const safeAgentProfile = agentProfile.toObject();
    delete safeAgentProfile.userId;

    return serializeListingPayloadForApi({
        agentProfile: safeAgentProfile,
        listings: result?.data ?? [],
        pagination: normalizePagination(
            result?.pagination,
            params.page,
            params.limit
        ),
    });
};
