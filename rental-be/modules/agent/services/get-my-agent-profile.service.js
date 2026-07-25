// modules/agent/services/get-my-agent-profile.service.js
import {
    validateMongooseId,
    validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Listing from "../../listing/listing.model.js";
import { PENDING_POST_STATUSES } from "../../pending-post/pending-post.constants.js";
import PendingPost from "../../pending-post/pending-post.model.js";
import AgentProfile from "../agent-profile.model.js";

const emptyListingSummary = {
    activeCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
};

const buildListingSummary = async (userId, session) => {
    let activeListingsQuery = Listing.countDocuments({
        listedBy: userId,
        isDeleted: false,
    });

    let pendingPostsQuery = PendingPost.aggregate([
        {
            $match: {
                submittedBy: userId,
                isDeleted: { $ne: true },
                status: {
                    $in: [
                        PENDING_POST_STATUSES.PENDING,
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

    const [activeCount, pendingPostCounts] = await Promise.all([
        activeListingsQuery,
        pendingPostsQuery,
    ]);

    return pendingPostCounts.reduce(
        (summary, item) => {
            if (item._id === PENDING_POST_STATUSES.PENDING) {
                summary.pendingCount = item.count;
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

export const getMyAgentProfileService = async (actorId, session = null) => {
    validateNullableObject(session, "session");

    const userId = validateMongooseId(actorId, "userId", {
        asObjectId: true,
    });

    let query = AgentProfile.findOne({ userId, isDeleted: false });

    if (session) {
        query = query.session(session);
    }

    const agentProfile = await query;

    if (!agentProfile) {
        throw new AppError(
            "Agent profile not found",
            404,
            "AGENT_PROFILE_NOT_FOUND"
        );
    }

    const listingSummary = await buildListingSummary(userId, session);

    return {
        ...agentProfile.toObject(),
        listingSummary,
    };
};
