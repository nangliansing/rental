import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";

import { initializeEnvironment } from "../config/index.js";
import {
  verifyAccessToken,
  verifyRefreshToken,
} from "../shared/auth/index.js";
import AuthIdentity from "../modules/auth-identity/auth-identity.model.js";
import Notification from "../modules/notification/notification.model.js";
import { NOTIFICATION_TYPES } from "../modules/notification/notification.constants.js";
import { loginUserWithGoogleService } from "../modules/user/services/login-user-with-google.service.js";
import {
  AUTH_PROVIDERS,
  USER_ROLES,
  USER_STATUSES,
} from "../modules/user/user.constants.js";
import User from "../modules/user/user.model.js";

const trustedClientId =
  "1060222059887-test.apps.googleusercontent.com";
const baseClaims = Object.freeze({
  subject: "google-subject-123",
  email: "google.user@example.com",
  emailVerified: true,
  name: "Google User",
  picture: "https://example.com/google-user.jpg",
});

let replSet;

const verifyAs = (claims = baseClaims) => async (credential) => {
  assert.equal(credential, "verified-google-credential");
  return claims;
};

const login = (claims = baseClaims) =>
  loginUserWithGoogleService(
    { credential: "verified-google-credential" },
    { verifyCredential: verifyAs(claims) },
  );

before(async () => {
  initializeEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1:27017/google_login_test",
    JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
    JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_IDS: trustedClientId,
    CLOUDINARY_CLOUD_NAME: "test-cloud",
    CLOUDINARY_API_KEY: "test-api-key",
    CLOUDINARY_API_SECRET: "test-api-secret",
  });

  replSet = await MongoMemoryReplSet.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri("google_login_test"), {
    autoIndex: false,
  });
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await Promise.all([
    User.createIndexes(),
    AuthIdentity.createIndexes(),
    Notification.createIndexes(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe("Google login service", () => {
  test("creates an account, identity, welcome notification, and local session", async () => {
    const result = await login();
    const [user, identity, notification] = await Promise.all([
      User.findOne({ email: baseClaims.email }).select("+password"),
      AuthIdentity.findOne({
        provider: AUTH_PROVIDERS.GOOGLE,
        providerSubject: baseClaims.subject,
      }).select("+passwordHash"),
      Notification.findOne({ recipient: result.user._id }),
    ]);

    assert.equal(result.isNewUser, true);
    assert.equal(typeof result.accessToken, "string");
    assert.equal(typeof result.refreshToken, "string");
    const accessPayload = verifyAccessToken(result.accessToken);
    const refreshPayload = verifyRefreshToken(result.refreshToken);
    assert.equal(accessPayload.sub, user._id.toString());
    assert.equal(accessPayload.role, USER_ROLES.USER);
    assert.equal(refreshPayload.sub, user._id.toString());
    assert.equal(refreshPayload.tokenType, "refresh");
    assert.equal(user.name, baseClaims.name);
    assert.equal(user.authProvider, AUTH_PROVIDERS.GOOGLE);
    assert.equal(user.role, USER_ROLES.USER);
    assert.equal(user.status, USER_STATUSES.ACTIVE);
    assert.equal(user.password, null);
    assert.equal(identity.userId.toString(), user._id.toString());
    assert.equal(identity.providerEmail, baseClaims.email);
    assert.equal(identity.emailVerified, true);
    assert.equal(identity.passwordHash, null);
    assert.ok(identity.lastAuthenticatedAt instanceof Date);
    assert.equal(notification.type, NOTIFICATION_TYPES.WELCOME);
    assert.equal(notification.title, "Welcome");
    assert.match(notification.message, /Complete your profile/);
    assert.match(notification.message, /listing rooms/);
    assert.doesNotMatch(notification.message, /agent/i);
    assert.equal(notification.link, "/profile");
  });

  test("returns an existing account without duplicating its welcome notification", async () => {
    const first = await login();
    const changedClaims = {
      ...baseClaims,
      email: "updated.google.email@example.com",
      name: "Changed Google Name",
    };
    const second = await login(changedClaims);
    const identity = await AuthIdentity.findOne({
      provider: AUTH_PROVIDERS.GOOGLE,
      providerSubject: baseClaims.subject,
    });
    const persistedUser = await User.findById(first.user._id);

    assert.equal(second.isNewUser, false);
    assert.equal(second.user._id.toString(), first.user._id.toString());
    assert.equal(identity.providerEmail, changedClaims.email);
    assert.equal(persistedUser.email, baseClaims.email);
    assert.equal(persistedUser.name, baseClaims.name);
    assert.equal(await Notification.countDocuments(), 1);
  });

  test("uses a safe email-derived name when Google omits the display name", async () => {
    const result = await login({
      ...baseClaims,
      subject: "google-subject-without-name",
      email: "profile.name@example.com",
      name: null,
    });

    assert.equal(result.isNewUser, true);
    assert.equal(result.user.name, "profile.name");
  });

  test("does not write account data when Google verification fails", async () => {
    const verificationError = new Error("verification failed");

    await assert.rejects(
      loginUserWithGoogleService(
        { credential: "verified-google-credential" },
        {
          verifyCredential: async () => {
            throw verificationError;
          },
        },
      ),
      verificationError,
    );

    assert.equal(await User.countDocuments(), 0);
    assert.equal(await AuthIdentity.countDocuments(), 0);
    assert.equal(await Notification.countDocuments(), 0);
  });

  test("does not automatically link an existing account by email", async () => {
    await User.create({
      name: "Existing Password User",
      email: baseClaims.email,
      authProvider: AUTH_PROVIDERS.PASSWORD,
    });

    await assert.rejects(login(), (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "ACCOUNT_LINK_REQUIRED");
      return true;
    });

    assert.equal(await AuthIdentity.countDocuments(), 0);
    assert.equal(await Notification.countDocuments(), 0);
  });

  for (const status of [USER_STATUSES.SUSPENDED, USER_STATUSES.INACTIVE]) {
    test(`rejects a returning ${status.toLowerCase()} account`, async () => {
      const created = await login();
      await User.updateOne({ _id: created.user._id }, { $set: { status } });

      await assert.rejects(login(), (error) => {
        assert.equal(
          error.code,
          status === USER_STATUSES.SUSPENDED
            ? "ACCOUNT_SUSPENDED"
            : "ACCOUNT_INACTIVE",
        );
        return true;
      });
    });
  }

  test("rejects an identity whose local account no longer exists", async () => {
    const missingUserId = new mongoose.Types.ObjectId();
    await AuthIdentity.create({
      userId: missingUserId,
      provider: AUTH_PROVIDERS.GOOGLE,
      providerSubject: baseClaims.subject,
      providerEmail: baseClaims.email,
      emailVerified: true,
    });

    await assert.rejects(login(), (error) => {
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, "ACCOUNT_UNAVAILABLE");
      return true;
    });

    assert.equal(await User.countDocuments(), 0);
    assert.equal(await Notification.countDocuments(), 0);
  });

  test("makes concurrent first logins converge on one account", async () => {
    const results = await Promise.all([login(), login()]);

    assert.equal(await User.countDocuments(), 1);
    assert.equal(await AuthIdentity.countDocuments(), 1);
    assert.equal(await Notification.countDocuments(), 1);
    assert.equal(
      results[0].user._id.toString(),
      results[1].user._id.toString(),
    );
    assert.deepEqual(
      results.map((result) => result.isNewUser).sort(),
      [false, true],
    );
  });
});
