// modules/agent/mappers/build-create-agent-profile-record.js
import { validateObject } from "../../../shared/validators/index.js";

import {
    validateUserId,
    validateDisplayName,
    validateDescription,
    validatePhone,
    validateLineUrl,
    validateWhatsappPhone,
    validateTelegramUrl,
    validateViberPhone,
    validateSupportLanguages,
    validateProfilePhoto,
    validateAtLeastOneContactMethod,
} from "../agent-profile.validation.js";

export const buildCreateAgentProfileRecord = (body, actorId) => {
    validateObject(body, "body");

    const phone = validatePhone(body.phone);
    const lineUrl = validateLineUrl(body.lineUrl);
    const whatsappPhone = validateWhatsappPhone(body.whatsappPhone);
    const telegramUrl = validateTelegramUrl(body.telegramUrl);
    const viberPhone = validateViberPhone(body.viberPhone);

    validateAtLeastOneContactMethod({
        phone,
        lineUrl,
        whatsappPhone,
        telegramUrl,
        viberPhone,
    });

    return {
        userId: validateUserId(actorId),

        isOnline: false,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,

        displayName: validateDisplayName(body.displayName),
        profilePhoto: validateProfilePhoto(body.profilePhoto),
        description: validateDescription(body.description),

        phone,
        lineUrl,
        whatsappPhone,
        telegramUrl,
        viberPhone,

        supportLanguages: validateSupportLanguages(body.supportLanguages),

        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
    };
};
