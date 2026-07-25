// modules/agent/mappers/build-owner-update-agent-profile-record.js
import { validateObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import {
    validateDisplayName,
    validateDescription,
    validatePhone,
    validateLineUrl,
    validateWhatsappPhone,
    validateTelegramUrl,
    validateViberPhone,
    validateSupportLanguages,
    validateProfilePhoto,
} from "../agent-profile.validation.js";

export const buildOwnerUpdateAgentProfileRecord = (body) => {
    validateObject(body, "body");

    const update = {};

    if (body.displayName !== undefined) {
        update.displayName = validateDisplayName(body.displayName);
    }

    if (body.profilePhoto !== undefined) {
        update.profilePhoto = validateProfilePhoto(body.profilePhoto);
    }

    if (body.description !== undefined) {
        update.description = validateDescription(body.description);
    }

    if (body.phone !== undefined) {
        update.phone = validatePhone(body.phone);
    }

    if (body.lineUrl !== undefined) {
        update.lineUrl = validateLineUrl(body.lineUrl);
    }

    if (body.whatsappPhone !== undefined) {
        update.whatsappPhone = validateWhatsappPhone(body.whatsappPhone);
    }

    if (body.telegramUrl !== undefined) {
        update.telegramUrl = validateTelegramUrl(body.telegramUrl);
    }

    if (body.viberPhone !== undefined) {
        update.viberPhone = validateViberPhone(body.viberPhone);
    }

    if (body.supportLanguages !== undefined) {
        update.supportLanguages = validateSupportLanguages(
            body.supportLanguages
        );
    }

    if (Object.keys(update).length === 0) {
        throw new AppError(
            "No valid fields provided for update",
            422,
            "VALIDATION_ERROR"
        );
    }

    return update;
};