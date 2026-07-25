// modules/search/services/search-agent-profile-by-id.service.js
import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import AgentProfile from "../../agent/agent-profile.model.js";
import { buildBuildingFromListingLookupStages } from "../../listing/pipelines/helpers/index.js";
import Listing from "../../listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";
import { PENDING_POST_STATUSES } from "../../pending-post/pending-post.constants.js";
import PendingPost from "../../pending-post/pending-post.model.js";
import User from "../../user/user.model.js";
import { USER_STATUSES } from "../../user/user.constants.js";

import { buildSearchAgentProfileByIdParams } from "../params/index.js";

const emptyListingSummary = {
    activeCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
};

const AGENT_PROFILE_PUBLIC_FIELDS =
    "isOnline displayName profilePhoto description phone lineUrl whatsappPhone telegramUrl viberPhone supportLanguages reviewSummary isVerified createdAt userId";

const buildActiveListingCountPipeline = (userId) => [
    {
        $match: {
            listedBy: userId,
            isDeleted: false,
            visibility: LISTING_VISIBILITIES.PUBLIC,
        },
    },
    ...buildBuildingFromListingLookupStages({
        preserveNullAndEmptyArrays: false,
        requireActive: true,
    }),
    {
        $count: "total",
    },
];

const buildListingSummary = async (userId, session) => {
    let activeListingsQuery = Listing.aggregate(
        buildActiveListingCountPipeline(userId)
    );

    let pendingPostsQuery = PendingPost.aggregate([
        {
            $match: {
                submittedBy: userId,
                isDeleted: { $ne: true },
                status: {
                    $in: [
                        PENDING_POST_STATUSES.PENDING,
                        PENDING_POST_STATUSES.APPROVED,
                        PENDING_POST_STATUSES.REJECTED,
                    ],
                },
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    if (session) {
        activeListingsQuery = activeListingsQuery.session(session);
        pendingPostsQuery = pendingPostsQuery.session(session);
    }

    const [activeListingCounts, pendingPostCounts] = await Promise.all([
        activeListingsQuery,
        pendingPostsQuery,
    ]);
    const activeCount = activeListingCounts[0]?.total ?? 0;

    return pendingPostCounts.reduce(
        (summary, item) => {
            if (item._id === PENDING_POST_STATUSES.PENDING) {
                summary.pendingCount = item.count;
            }

            if (item._id === PENDING_POST_STATUSES.APPROVED) {
                summary.approvedCount = item.count;
            }

            if (item._id === PENDING_POST_STATUSES.REJECTED) {
                summary.rejectedCount = item.count;
            }

            return summary;
        },
        {
            ...emptyListingSummary,
            activeCount,
        }
    );
};

export const searchAgentProfileByIdService = async ({
    paramsInput,
    session = null,
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchAgentProfileByIdParams(paramsInput);

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

    const listingSummary = await buildListingSummary(
        agentProfile.userId,
        session
    );
    const safeAgentProfile = agentProfile.toObject();
    delete safeAgentProfile.userId;

    return {
        ...safeAgentProfile,
        listingSummary,
    };
};
