// Done
// modules/search/pipelines/helpers/build-agent-profile-from-listing-lookup-stages.js
import { COLLECTION_NAMES } from "../../../../shared/constants/index.js";
import { USER_STATUSES } from "../../../user/user.constants.js";

export const buildAgentProfileFromListingLookupStages = ({
    supportLanguages,
    removeAgentProfile = false,
    preserveNullAndEmptyArrays = true,
    requireActiveUser = true,
    requireAgentProfile = supportLanguages !== undefined || requireActiveUser,
} = {}) => {
    const agentProfilePipeline = [
        {
            $match: {
                $expr: { $eq: ["$userId", "$$listedBy"] },
                isDeleted: { $ne: true },
                ...(supportLanguages !== undefined
                    ? {
                        supportLanguages: {
                            $in: supportLanguages,
                        },
                    }
                    : {}),
            },
        },
    ];

    if (requireActiveUser) {
        agentProfilePipeline.push(
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
                $project: {
                    user: 0,
                },
            }
        );
    }

    agentProfilePipeline.push({
        $project: {
            userId: 1,
            isOnline: 1,
            displayName: 1,
            profilePhoto: 1,
            phone: 1,
            lineUrl: 1,
            whatsappPhone: 1,
            telegramUrl: 1,
            viberPhone: 1,
            supportLanguages: 1,
            reviewSummary: 1,
            isVerified: 1,
        },
    });

    const stages = [
        {
            $lookup: {
                from: COLLECTION_NAMES.AgentProfiles,
                let: { listedBy: "$listedBy" },
                pipeline: agentProfilePipeline,
                as: "agentProfile",
            },
        },
        {
            $unwind: {
                path: "$agentProfile",
                preserveNullAndEmptyArrays: requireAgentProfile
                    ? false
                    : preserveNullAndEmptyArrays,
            },
        },
    ];

    if (removeAgentProfile) {
        stages.push({
            $project: {
                agentProfile: 0,
            },
        });
    }

    return stages;
};
