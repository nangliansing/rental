import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import AuthIdentity from "../modules/auth-identity/auth-identity.model.js";
import { AUTH_PROVIDERS } from "../modules/user/user.constants.js";
import { up as addAuthIdentities } from "../scripts/migrations/20260720T170000Z_add-auth-identities.js";

let mongoServer;
let db;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("auth_identity_test"), {
    autoIndex: false,
  });
  db = mongoose.connection.db;
});

beforeEach(async () => {
  await db.dropDatabase();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("authentication identity foundation", () => {
  test("enforces provider-specific credential fields", async () => {
    const userId = new mongoose.Types.ObjectId();

    await assert.rejects(
      AuthIdentity.create({
        userId,
        provider: AUTH_PROVIDERS.PASSWORD,
        providerEmail: "password@example.com",
      }),
      /passwordHash is required for PASSWORD/,
    );

    await assert.rejects(
      AuthIdentity.create({
        userId,
        provider: AUTH_PROVIDERS.GOOGLE,
        providerEmail: "google@example.com",
      }),
      /providerSubject is required for GOOGLE/,
    );

    const googleIdentity = await AuthIdentity.create({
      userId,
      provider: AUTH_PROVIDERS.GOOGLE,
      providerSubject: "google-subject-123",
      providerEmail: "Google@Example.com",
      emailVerified: true,
    });

    assert.equal(googleIdentity.providerEmail, "google@example.com");
    assert.equal(googleIdentity.passwordHash, null);
  });

  test("backfills password identities idempotently without contracting users", async () => {
    const userId = new mongoose.Types.ObjectId();
    const passwordHash = "$2b$12$existing-password-hash";
    const createdAt = new Date("2026-07-20T00:00:00.000Z");

    await db.collection("users").insertOne({
      _id: userId,
      name: "Password User",
      email: "password.user@example.com",
      password: passwordHash,
      authProvider: AUTH_PROVIDERS.PASSWORD,
      createdAt,
      updatedAt: createdAt,
    });

    await addAuthIdentities({ db });
    await addAuthIdentities({ db });

    const identities = await db.collection("auth_identities").find().toArray();
    const legacyUser = await db.collection("users").findOne({ _id: userId });
    const indexNames = (await db.collection("auth_identities").indexes()).map(
      (index) => index.name,
    );

    assert.equal(identities.length, 1);
    assert.equal(identities[0].userId.toString(), userId.toString());
    assert.equal(identities[0].provider, AUTH_PROVIDERS.PASSWORD);
    assert.equal(identities[0].providerSubject, null);
    assert.equal(identities[0].providerEmail, "password.user@example.com");
    assert.equal(identities[0].passwordHash, passwordHash);
    assert.equal(legacyUser.password, passwordHash);
    assert.equal(legacyUser.authProvider, AUTH_PROVIDERS.PASSWORD);
    assert.ok(indexNames.includes("auth_identity_user_provider_unique"));
    assert.ok(indexNames.includes("auth_identity_provider_subject_unique"));
  });

  test("leaves accounts without usable credentials untouched", async () => {
    await db.collection("users").insertMany([
      {
        email: "legacy.google@example.com",
        authProvider: AUTH_PROVIDERS.GOOGLE,
      },
      {
        email: "missing.hash@example.com",
        authProvider: AUTH_PROVIDERS.PASSWORD,
        password: null,
      },
    ]);

    await addAuthIdentities({ db });

    assert.equal(await db.collection("auth_identities").countDocuments(), 0);
    assert.equal(await db.collection("users").countDocuments(), 2);
  });
});
