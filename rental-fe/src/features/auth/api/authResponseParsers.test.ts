import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  parseAuthUser,
  parseGetCurrentUserResponse,
} from "./authResponseParsers"

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
}

const validUserRecord = {
  _id: "user-1",
  name: "Rental User",
  email: "user@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

describe("parseAuthUser", () => {
  it("parses profilePhoto when present", () => {
    expect(
      parseAuthUser({
        ...validUserRecord,
        profilePhoto: sampleProfilePhoto,
      }).profilePhoto,
    ).toEqual(sampleProfilePhoto)
  })

  it("returns null profilePhoto when absent or invalid", () => {
    expect(parseAuthUser(validUserRecord).profilePhoto).toBeNull()
    expect(parseAuthUser({ ...validUserRecord, profilePhoto: {} }).profilePhoto).toBeNull()
    expect(
      parseAuthUser({ ...validUserRecord, profilePhoto: "not-an-object" }).profilePhoto,
    ).toBeNull()
  })

  it("defaults missing scalar fields safely", () => {
    expect(parseAuthUser({})).toEqual({
      _id: "",
      name: "",
      email: "",
      profilePhoto: null,
      authProvider: "UNKNOWN",
      role: "USER",
      status: "UNKNOWN",
      createdAt: "",
      updatedAt: "",
    })
  })
})

describe("parseGetCurrentUserResponse", () => {
  it("accepts a valid current-user envelope", () => {
    expect(
      parseGetCurrentUserResponse({
        success: true,
        data: { user: validUserRecord },
      }),
    ).toEqual(validUserRecord)
  })

  it("accepts profilePhoto in the current-user envelope", () => {
    expect(
      parseGetCurrentUserResponse({
        success: true,
        data: {
          user: {
            ...validUserRecord,
            profilePhoto: sampleProfilePhoto,
          },
        },
      }).profilePhoto,
    ).toEqual(sampleProfilePhoto)
  })

  it("rejects malformed envelopes", () => {
    for (const payload of [
      { success: false, data: { user: validUserRecord } },
      { success: true, data: {} },
      { success: true, data: { user: { ...validUserRecord, _id: "" } } },
      { success: true, data: { user: { ...validUserRecord, email: "" } } },
      { success: true, data: { user: { ...validUserRecord, authProvider: "UNKNOWN" } } },
      { success: true, data: { user: { ...validUserRecord, role: "INVALID" } } },
      { success: true, data: { user: { ...validUserRecord, status: "UNKNOWN" } } },
      { success: true, data: { user: { ...validUserRecord, createdAt: "" } } },
    ]) {
      expect(() => parseGetCurrentUserResponse(payload)).toThrow(ApiError)
    }
  })
})
