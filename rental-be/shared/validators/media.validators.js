// shared/validators/media.validators.js
import { AppError } from "../errors/app-error.js";

import {
    validateObject,
    validateRequiredString,
    validateOptionalString,
    validateBoolean,
    validateNumberRange,
    validateNullableNumberRange,
} from "./index.js";

const DEFAULT_MAX_MEDIA_COUNT = 20;

export const validateMediaItem = (input, fieldName = "media") => {
    validateObject(input, fieldName);

    return {
        publicId: validateRequiredString(input.publicId, `${fieldName}.publicId`, 255),
        secureUrl: validateRequiredString(input.secureUrl, `${fieldName}.secureUrl`, 2000),
        resourceType:
            validateOptionalString(input.resourceType, `${fieldName}.resourceType`, 50) ?? "image",
        format: validateOptionalString(input.format, `${fieldName}.format`, 20),
        width: validateNullableNumberRange(
            input.width,
            `${fieldName}.width`,
            0,
            Number.MAX_SAFE_INTEGER
        ),
        height: validateNullableNumberRange(
            input.height,
            `${fieldName}.height`,
            0,
            Number.MAX_SAFE_INTEGER
        ),
        bytes: validateNullableNumberRange(
            input.bytes,
            `${fieldName}.bytes`,
            0,
            Number.MAX_SAFE_INTEGER
        ),
        position: validateNumberRange(
            input.position ?? 0,
            `${fieldName}.position`,
            0,
            Number.MAX_SAFE_INTEGER
        ),
        alt: validateOptionalString(input.alt, `${fieldName}.alt`, 255),
        isCover:
            input.isCover == null
                ? false
                : validateBoolean(input.isCover, `${fieldName}.isCover`),
    };
};

export const validateMediaArray = (
    input,
    fieldName = "media",
    maxCount = DEFAULT_MAX_MEDIA_COUNT
) => {
    if (input == null) return [];

    if (!Number.isInteger(maxCount) || maxCount < 1) {
        throw new AppError(
            "maxCount must be a positive integer",
            500,
            "INTERNAL_ERROR"
        );
    }

    if (!Array.isArray(input)) {
        throw new AppError(
            `${fieldName} must be an array`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (input.length > maxCount) {
        throw new AppError(
            `${fieldName} cannot contain more than ${maxCount} items`,
            422,
            "VALIDATION_ERROR"
        );
    }

    const media = input.map((item, index) => {
        return validateMediaItem(item, `${fieldName}.${index}`);
    });

    const coverCount = media.filter((item) => item.isCover).length;

    if (coverCount > 1) {
        throw new AppError(
            `${fieldName} can only contain one cover item`,
            422,
            "VALIDATION_ERROR"
        );
    }

    return media;
};