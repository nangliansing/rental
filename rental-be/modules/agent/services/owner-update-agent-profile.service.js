// modules/agent/services/owner-update-agent-profile.service.js
import {
    validateMongooseId,
    validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { buildOwnerUpdateAgentProfileRecord } from "../mappers/index.js";
import { validateAtLeastOneContactMethod } from "../agent-profile.validation.js";
import AgentProfile from "../agent-profile.model.js";

const CONTACT_FIELDS = [
    "phone",
    "lineUrl",
    "whatsappPhone",
    "telegramUrl",
    "viberPhone",
];

const throwAgentProfileNotFound = () => {
    throw new AppError(
        "Agent profile not found",
        404,
        "AGENT_PROFILE_NOT_FOUND"
    );
};

const throwNoProfileChanges = () => {
    throw new AppError(
        "No profile changes provided",
        422,
        "VALIDATION_ERROR"
    );
};

const normalizeForCompare = (value) => {
    if (value && typeof value.toObject === "function") {
        return normalizeForCompare(value.toObject());
    }

    if (Array.isArray(value)) {
        return value.map(normalizeForCompare);
    }

    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((record, key) => {
                record[key] = normalizeForCompare(value[key]);
                return record;
            }, {});
    }

    return value ?? null;
};

const areValuesEqual = (firstValue, secondValue) => {
    return (
        JSON.stringify(normalizeForCompare(firstValue)) ===
        JSON.stringify(normalizeForCompare(secondValue))
    );
};

const assertHasProfileChanges = (update, existingAgentProfile) => {
    const hasChanges = Object.entries(update).some(([fieldName, value]) => {
        return !areValuesEqual(value, existingAgentProfile[fieldName]);
    });

    if (!hasChanges) {
        throwNoProfileChanges();
    }
};

const buildNextContactMethods = (update, existingAgentProfile) => {
    return CONTACT_FIELDS.reduce((contactMethods, fieldName) => {
        contactMethods[fieldName] =
            update[fieldName] !== undefined
                ? update[fieldName]
                : existingAgentProfile[fieldName];

        return contactMethods;
    }, {});
};

export const ownerUpdateAgentProfileService = async (
    body,
    actorId,
    session = null
) => {
    validateNullableObject(session, "session");

    const userId = validateMongooseId(actorId, "userId");
    const update = buildOwnerUpdateAgentProfileRecord(body);

    let agentProfileQuery = AgentProfile.findOne({ userId, isDeleted: false });

    if (session) {
        agentProfileQuery = agentProfileQuery.session(session);
    }

    const existingAgentProfile = await agentProfileQuery;

    if (!existingAgentProfile) {
        throwAgentProfileNotFound();
    }

    assertHasProfileChanges(update, existingAgentProfile);
    validateAtLeastOneContactMethod(
        buildNextContactMethods(update, existingAgentProfile)
    );

    let query = AgentProfile.findOneAndUpdate(
        { _id: existingAgentProfile._id, isDeleted: false },
        { $set: update },
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (session) {
        query = query.session(session);
    }

    const updatedAgentProfile = await query;

    if (!updatedAgentProfile) {
        throwAgentProfileNotFound();
    }

    return updatedAgentProfile;
};
