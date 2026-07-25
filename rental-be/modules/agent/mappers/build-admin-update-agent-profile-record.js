// modules/agent/mappers/build-admin-update-agent-profile-record.js
import { validateObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { validateIsVerified } from "../agent-profile.validation.js";
import { validateAdminReason } from "../../../shared/validators/index.js";

export const buildAdminUpdateAgentProfileRecord = (body, actorId) => {
    validateObject(body, "body");

    const update = {};
    const reason = validateAdminReason(body.reason);

    if (body.isVerified !== undefined) {
        update.isVerified = validateIsVerified(body.isVerified);

        if (update.isVerified) {
            update.verifiedBy = actorId;
            update.verifiedAt = new Date();
        } else {
            update.verifiedBy = null;
            update.verifiedAt = null;
        }
    }

    if (Object.keys(update).length === 0) {
        throw new AppError(
            "No valid fields provided for update",
            422,
            "VALIDATION_ERROR"
        );
    }

    return {
        update,
        reason,
    };
};