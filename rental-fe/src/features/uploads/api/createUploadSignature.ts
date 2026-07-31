// src/features/uploads/api/createUploadSignature.ts
import { ApiError, apiClient } from "@/lib/api-client"

export type UploadPurpose =
  | "agent-profile-photo"
  | "user-profile-photo"
  | "listing-photo"

export type UploadSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  publicId: string
  signature: string
}

export type CreateUploadSignatureResponse = {
  success: true
  data: {
    uploadSignature: {
      purpose: UploadPurpose
      uploadSignatures: UploadSignature[]
    }
  }
}

type CreateUploadSignatureInput = {
  purpose: UploadPurpose
  count?: number
}

type CreateUploadSignaturePayload = {
  purpose: UploadPurpose
  count?: number
}

const uploadPurposes = new Set<UploadPurpose>([
  "agent-profile-photo",
  "user-profile-photo",
  "listing-photo",
])

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

function readString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function parseUploadSignature(value: unknown): UploadSignature {
  const signature = readRecord(value)
  const parsedSignature = {
    cloudName: readString(signature.cloudName),
    apiKey: readString(signature.apiKey),
    timestamp: readNumber(signature.timestamp),
    folder: readString(signature.folder),
    publicId: readString(signature.publicId),
    signature: readString(signature.signature),
  }

  if (
    !parsedSignature.cloudName ||
    !parsedSignature.apiKey ||
    parsedSignature.timestamp == null ||
    !parsedSignature.folder ||
    !parsedSignature.publicId ||
    !parsedSignature.signature
  ) {
    throw new ApiError(
      "Upload signature response is missing required data.",
      500,
      "INVALID_UPLOAD_SIGNATURE_RESPONSE",
    )
  }

  return parsedSignature as UploadSignature
}

function parseUploadPurpose(value: unknown): UploadPurpose {
  const purpose = readString(value)

  if (!uploadPurposes.has(purpose as UploadPurpose)) {
    throw new ApiError(
      "Upload signature response has an invalid purpose.",
      500,
      "INVALID_UPLOAD_SIGNATURE_RESPONSE",
    )
  }

  return purpose as UploadPurpose
}

function parseUploadSignatureResponse(value: unknown) {
  const body = readRecord(value)
  const data = readRecord(body.data)
  const uploadSignature = readRecord(data.uploadSignature)
  const uploadSignatures = uploadSignature.uploadSignatures

  if (body.success !== true || !Array.isArray(uploadSignatures)) {
    throw new ApiError(
      "Upload signature response is missing required data.",
      500,
      "INVALID_UPLOAD_SIGNATURE_RESPONSE",
    )
  }

  return {
    purpose: parseUploadPurpose(uploadSignature.purpose),
    uploadSignatures: uploadSignatures.map(parseUploadSignature),
  }
}

export async function createUploadSignature({
  purpose,
  count,
}: CreateUploadSignatureInput): Promise<
  CreateUploadSignatureResponse["data"]["uploadSignature"]
> {
  const payload: CreateUploadSignaturePayload = { purpose }

  if (count !== undefined) {
    payload.count = count
  }

  const response = await apiClient.post<unknown>(
    "/uploads/signature",
    payload
  )

  return parseUploadSignatureResponse(response.data)
}
