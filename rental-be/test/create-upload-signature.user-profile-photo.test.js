import assert from "node:assert/strict"
import { describe, test } from "node:test"

import mongoose from "mongoose"

import { initializeEnvironment } from "../config/index.js"

initializeEnvironment({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017/upload_signature_test",
  GOOGLE_CLIENT_IDS: "1060222059887-test.apps.googleusercontent.com",
  JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
  JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-api-key",
  CLOUDINARY_API_SECRET: "test-api-secret",
})

const { createUploadSignatureService } = await import(
  "../modules/upload/services/create-upload-signature.service.js"
)

describe("createUploadSignatureService user-profile-photo", () => {
  test("returns a single users/{userId} signature", () => {
    const userId = new mongoose.Types.ObjectId()

    const result = createUploadSignatureService({
      userId,
      body: { purpose: "user-profile-photo" },
    })

    assert.equal(result.purpose, "user-profile-photo")
    assert.equal(result.uploadSignatures.length, 1)
    assert.match(result.uploadSignatures[0].folder, new RegExp(`users/${userId}`))
    assert.equal(typeof result.uploadSignatures[0].signature, "string")
  })

  test("rejects invalid upload purposes", () => {
    assert.throws(
      () =>
        createUploadSignatureService({
          userId: new mongoose.Types.ObjectId(),
          body: { purpose: "invalid-purpose" },
        }),
      (error) =>
        error instanceof Error && /Invalid upload purpose/.test(error.message),
    )
  })
})
