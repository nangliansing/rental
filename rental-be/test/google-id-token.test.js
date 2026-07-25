import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { verifyGoogleIdToken } from "../shared/auth/google-id-token.js";

const clientIds = [
  "1060222059887-web.apps.googleusercontent.com",
  "1060222059887-mobile.apps.googleusercontent.com",
];

const createClient = (payload) => {
  const calls = [];

  return {
    calls,
    client: {
      async verifyIdToken(options) {
        calls.push(options);
        return { getPayload: () => payload };
      },
    },
  };
};

const assertInvalidCredential = async (promise) => {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, "AppError");
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, "INVALID_GOOGLE_CREDENTIAL");
    assert.equal(error.message, "Google sign-in could not be verified");
    return true;
  });
};

describe("Google ID token verification", () => {
  test("verifies the expected audiences and returns normalized claims", async () => {
    const { calls, client } = createClient({
      sub: "  google-subject-123  ",
      email: "  User@Example.com  ",
      email_verified: true,
      name: "  Example User  ",
      picture: "  https://example.com/avatar.jpg  ",
    });

    const claims = await verifyGoogleIdToken(" google-id-token ", {
      client,
      clientIds,
    });

    assert.deepEqual(calls, [
      { idToken: "google-id-token", audience: clientIds },
    ]);
    assert.deepEqual(claims, {
      subject: "google-subject-123",
      email: "user@example.com",
      emailVerified: true,
      name: "Example User",
      picture: "https://example.com/avatar.jpg",
    });
    assert.ok(Object.isFrozen(claims));
  });

  test("normalizes absent optional profile claims to null", async () => {
    const { client } = createClient({
      sub: "google-subject-123",
      email: "user@example.com",
      email_verified: true,
    });

    const claims = await verifyGoogleIdToken("google-id-token", {
      client,
      clientIds,
    });

    assert.equal(claims.name, null);
    assert.equal(claims.picture, null);
  });

  test("rejects Google library verification failures without leaking details", async () => {
    const client = {
      async verifyIdToken() {
        throw new Error("signature mismatch for a sensitive raw token");
      },
    };

    await assertInvalidCredential(
      verifyGoogleIdToken("invalid-token", { client, clientIds }),
    );
  });

  for (const [label, payload] of [
    ["missing payload", undefined],
    ["missing subject", { email: "user@example.com", email_verified: true }],
    ["blank subject", { sub: " ", email: "user@example.com", email_verified: true }],
    ["missing email", { sub: "subject", email_verified: true }],
    ["blank email", { sub: "subject", email: " ", email_verified: true }],
    ["unverified email", { sub: "subject", email: "user@example.com", email_verified: false }],
    ["non-boolean verification", { sub: "subject", email: "user@example.com", email_verified: "true" }],
  ]) {
    test(`rejects a verified ticket with ${label}`, async () => {
      const { client } = createClient(payload);

      await assertInvalidCredential(
        verifyGoogleIdToken("google-id-token", { client, clientIds }),
      );
    });
  }

  test("rejects a missing credential before calling Google", async () => {
    const { calls, client } = createClient({});

    await assertInvalidCredential(
      verifyGoogleIdToken(" ", { client, clientIds }),
    );
    assert.equal(calls.length, 0);
  });
});
