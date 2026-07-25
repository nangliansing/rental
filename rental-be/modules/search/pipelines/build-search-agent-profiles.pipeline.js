// modules/search/pipelines/build-search-agent-profiles.pipeline.js
import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import { USER_STATUSES } from "../../user/user.constants.js";

const AGENT_PROFILE_SEARCH_INDEX = "agent_profile_display_name_autocomplete";

export const buildSearchAgentProfilesPipeline = ({ query, limit = 20 }) => {
    return [
        {
            $search: {
                index: AGENT_PROFILE_SEARCH_INDEX,
                compound: {
                    must: [
                        {
                            autocomplete: {
                                query,
                                path: "displayName",
                                tokenOrder: "sequential",
                            },
                        },
                    ],
                    mustNot: [
                        {
                            equals: {
                                path: "isDeleted",
                                value: true,
                            },
                        },
                    ],
                },
            },
        },
        {
            $lookup: {
                from: COLLECTION_NAMES.Users,
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        },
        {
            $match: {
                "user.status": USER_STATUSES.ACTIVE,
            },
        },
        {
            $limit: limit,
        },
        {
            $project: {
                _id: 1,
                displayName: 1,
                profilePhoto: 1,
                description: 1,
                supportLanguages: 1,
                reviewSummary: 1,
                isVerified: 1,
                isOnline: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ];
};
