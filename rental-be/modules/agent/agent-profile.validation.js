// modules/agent/agent-profile.validation.js
import {
    validateMongooseId,
    validateBoolean,
    validateRequiredString,
    validateOptionalString,
    validateStringArray,
    validateMediaItem,
    validateUrl,
} from "../../shared/validators/index.js";

import { AppError } from "../../shared/errors/app-error.js";

export const validateUserId = (input) => {
    return validateMongooseId(input, "userId");
};

export const validateIsOnline = (input) => {
    if (input == null) return false;

    return validateBoolean(input, "isOnline");
};

export const validateDisplayName = (input) => {
    return validateRequiredString(input, "displayName", 255);
};

export const validateProfilePhoto = (input) => {
    if (input == null) return null;

    return validateMediaItem(input, "profilePhoto");
};

export const validateDescription = (input) => {
    return validateOptionalString(input, "description", 3000);
};

export const validatePhone = (input) => {
    return validateOptionalString(input, "phone", 50);
};

const validateAllowedHost = (urlString, fieldName, allowedHosts) => {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const normalizedAllowedHosts = allowedHosts.map((host) => host.toLowerCase());

    if (!normalizedAllowedHosts.includes(hostname)) {
        throw new AppError(
            `${fieldName} must use one of: ${allowedHosts.join(", ")}`,
            422,
            "VALIDATION_ERROR"
        );
    }

    return urlString;
};

export const validateLineUrl = (input) => {
    const value = validateUrl(input, "lineUrl", {
        required: false,
        max: 500,
        allowedProtocols: ["https:"],
    });

    if (value == null) return null;

    return validateAllowedHost(value, "lineUrl", [
        "line.me",
        "www.line.me",
        "lin.ee",
    ]);
};

export const validateTelegramUrl = (input) => {
    const value = validateUrl(input, "telegramUrl", {
        required: false,
        max: 500,
        allowedProtocols: ["https:"],
    });

    if (value == null) return null;

    return validateAllowedHost(value, "telegramUrl", [
        "t.me",
        "telegram.me",
        "www.telegram.me",
    ]);
};

export const validateWhatsappPhone = (input) => {
    return validateOptionalString(input, "whatsappPhone", 50);
};

export const validateViberPhone = (input) => {
    return validateOptionalString(input, "viberPhone", 50);
};

export const validateSupportLanguages = (input) => {
    const languages = validateStringArray(input, "supportLanguages");

    if (languages.length === 0) {
        throw new AppError(
            "supportLanguages must contain at least one language",
            422,
            "VALIDATION_ERROR"
        );
    }

    return languages;
};

export const validateAtLeastOneContactMethod = ({
    phone,
    lineUrl,
    whatsappPhone,
    telegramUrl,
    viberPhone,
}) => {
    const hasContactMethod = [
        phone,
        lineUrl,
        whatsappPhone,
        telegramUrl,
        viberPhone,
    ].some(Boolean);

    if (!hasContactMethod) {
        throw new AppError(
            "At least one contact method is required",
            422,
            "VALIDATION_ERROR"
        );
    }
};

export const validateIsVerified = (input) => {
    if (input == null) return false;

    return validateBoolean(input, "isVerified");
};

export const validateVerifiedBy = (input) => {
    if (input == null) return null;

    return validateMongooseId(input, "verifiedBy");
};

export const validateVerifiedAt = (input) => {
    if (input == null) return null;

    const date = new Date(input);

    if (Number.isNaN(date.getTime())) {
        throw new AppError("verifiedAt must be a valid date", 422, "VALIDATION_ERROR");
    }

    return date;
};
