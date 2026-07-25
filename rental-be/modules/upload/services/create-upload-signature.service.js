// modules/upload/services/create-upload-signature.service.js
import crypto from "node:crypto";

import { getEnvironment } from "../../../config/index.js";
import cloudinary from "../../../shared/config/cloudinary.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateIntegerRange,
  validateMongooseId,
  validateObject,
  validateRequiredString,
} from "../../../shared/validators/index.js";

const MAX_UPLOAD_COUNT = 20;

const UPLOAD_PURPOSE_CONFIG = {
  "agent-profile-photo": {
    folder: "agent-profiles",
    maxCount: 1,
  },
  "listing-photo": {
    folder: "listings",
    maxCount: 20,
  },
};

function validateUploadPurpose(input) {
  const purpose = validateRequiredString(input, "purpose");
  const config = UPLOAD_PURPOSE_CONFIG[purpose];

  if (!config) {
    throw new AppError("Invalid upload purpose", 422, "VALIDATION_ERROR");
  }

  return { purpose, config };
}

function validateUploadCount(count, maxCount) {
  const allowedMaxCount = Math.min(maxCount, MAX_UPLOAD_COUNT);
  const normalizedCount = count === undefined ? 1 : count;

  return validateIntegerRange(
    normalizedCount,
    "count",
    1,
    allowedMaxCount
  );
}

function buildUploadSignature({ userId, folder }) {
  const { apiKey, apiSecret, cloudName } = getEnvironment().cloudinary;
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = crypto.randomUUID();
  const uploadFolder = `${folder}/${userId}`;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: uploadFolder,
      public_id: publicId,
    },
    apiSecret
  );

  return {
    cloudName,
    apiKey,
    timestamp,
    folder: uploadFolder,
    publicId,
    signature,
  };
}

export function createUploadSignatureService({ userId, body }) {
  const normalizedUserId = validateMongooseId(userId, "userId");
  const uploadInput = validateObject(body, "body");
  const { purpose, config } = validateUploadPurpose(uploadInput.purpose);
  const count = validateUploadCount(uploadInput.count, config.maxCount);

  const uploadSignatures = Array.from({ length: count }, () =>
    buildUploadSignature({
      userId: normalizedUserId,
      folder: config.folder,
    })
  );

  return {
    purpose,
    uploadSignatures,
  };
}
