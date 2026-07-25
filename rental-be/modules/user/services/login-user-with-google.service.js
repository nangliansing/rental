import mongoose from "mongoose";

import {
  signAccessToken,
  signRefreshToken,
  verifyGoogleIdToken,
} from "../../../shared/auth/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import AuthIdentity from "../../auth-identity/auth-identity.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import { createNotification } from "../../notification/services/index.js";
import { buildLoginUserWithGoogleRecord } from "../mappers/index.js";
import { AUTH_PROVIDERS } from "../user.constants.js";
import User from "../user.model.js";
import { assertActiveUser } from "../utils/index.js";

const GOOGLE_PROVIDER = AUTH_PROVIDERS.GOOGLE;

const buildWelcomeNotification = (user) => ({
  recipient: user._id,
  actor: null,
  type: NOTIFICATION_TYPES.WELCOME,
  title: "Welcome",
  message:
    "Welcome! Complete your profile to add your contact details and start listing rooms.",
  entityType: NOTIFICATION_ENTITY_TYPES.SYSTEM,
  entityId: null,
  link: "/profile",
  metadata: {
    event: "ACCOUNT_CREATED",
    authProvider: GOOGLE_PROVIDER,
  },
});

const buildNewUserName = ({ name, email }) => {
  if (name) {
    return name.slice(0, 255);
  }

  return email.split("@")[0].slice(0, 255) || "New user";
};

const toSafeUser = (user) => {
  const safeUser = user.toObject();
  delete safeUser.password;
  return safeUser;
};

const buildAuthenticationResult = ({ user, isNewUser }) => ({
  user: toSafeUser(user),
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user),
  isNewUser,
});

const findReturningGoogleUser = async (claims, session = null) => {
  let identityQuery = AuthIdentity.findOne({
    provider: GOOGLE_PROVIDER,
    providerSubject: claims.subject,
  });

  if (session) {
    identityQuery = identityQuery.session(session);
  }

  const identity = await identityQuery;

  if (!identity) {
    return null;
  }

  let userQuery = User.findById(identity.userId);

  if (session) {
    userQuery = userQuery.session(session);
  }

  const user = await userQuery;

  assertActiveUser(user, {
    notFoundMessage: "Account is unavailable",
    notFoundCode: "ACCOUNT_UNAVAILABLE",
    notFoundStatusCode: 401,
  });

  let updateQuery = AuthIdentity.findByIdAndUpdate(
    identity._id,
    {
      $set: {
        providerEmail: claims.email,
        emailVerified: claims.emailVerified,
        lastAuthenticatedAt: new Date(),
      },
    },
    { runValidators: true },
  );

  if (session) {
    updateQuery = updateQuery.session(session);
  }

  await updateQuery;
  return user;
};

const createGoogleAccount = async ({ claims, session }) => {
  const emailOwner = await User.findOne({ email: claims.email })
    .select("_id")
    .session(session);

  if (emailOwner) {
    throw new AppError(
      "An account already exists with this email",
      409,
      "ACCOUNT_LINK_REQUIRED",
    );
  }

  const [user] = await User.create(
    [
      {
        name: buildNewUserName(claims),
        email: claims.email,
        password: null,
        authProvider: GOOGLE_PROVIDER,
      },
    ],
    { session },
  );

  await AuthIdentity.create(
    [
      {
        userId: user._id,
        provider: GOOGLE_PROVIDER,
        providerSubject: claims.subject,
        providerEmail: claims.email,
        emailVerified: claims.emailVerified,
        passwordHash: null,
        lastAuthenticatedAt: new Date(),
      },
    ],
    { session },
  );

  const notification = await createNotification(
    buildWelcomeNotification(user),
    session,
  );

  return { notification, user };
};

const resolveDuplicateAccountCreation = async (claims) => {
  const user = await findReturningGoogleUser(claims);

  if (user) {
    return { isNewUser: false, notification: null, user };
  }

  throw new AppError(
    "An account already exists with this email",
    409,
    "ACCOUNT_LINK_REQUIRED",
  );
};

export const loginUserWithGoogleService = async (
  body,
  { verifyCredential = verifyGoogleIdToken } = {},
) => {
  const { credential } = buildLoginUserWithGoogleRecord(body);
  const claims = await verifyCredential(credential);
  const returningUser = await findReturningGoogleUser(claims);

  if (returningUser) {
    return buildAuthenticationResult({
      user: returningUser,
      isNewUser: false,
    });
  }

  const transactionSession = await mongoose.startSession();
  let account;

  try {
    await transactionSession.withTransaction(async () => {
      const concurrentlyCreatedUser = await findReturningGoogleUser(
        claims,
        transactionSession,
      );

      if (concurrentlyCreatedUser) {
        account = {
          isNewUser: false,
          notification: null,
          user: concurrentlyCreatedUser,
        };
        return;
      }

      account = await createGoogleAccount({
        claims,
        session: transactionSession,
      });
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    account = await resolveDuplicateAccountCreation(claims);
  } finally {
    await transactionSession.endSession();
  }

  if (account.notification) {
    emitNotificationToUser(
      account.notification.recipient.toString(),
      account.notification,
    );
  }

  return buildAuthenticationResult({
    user: account.user,
    isNewUser: account.isNewUser ?? true,
  });
};
