import bcrypt from "bcrypt";

import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    signAccessToken,
    signRefreshToken,
} from "../../../shared/auth/index.js";

import { buildLoginUserWithPasswordRecord } from "../mappers/index.js";
import { assertActiveUser } from "../utils/index.js";
import { AUTH_PROVIDERS } from "../user.constants.js";
import User from "../user.model.js";

const throwInvalidCredentials = () => {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
};

export const loginUserWithPasswordService = async (body, session = null) => {
    validateNullableObject(session, "session");

    const record = buildLoginUserWithPasswordRecord(body);

    let query = User.findOne({
        email: record.email,
        authProvider: AUTH_PROVIDERS.PASSWORD,
    }).select("+password");

    if (session) {
        query = query.session(session);
    }

    const user = await query;

    if (!user) {
        throwInvalidCredentials();
    }

    assertActiveUser(user);

    if (!user.password) {
        throwInvalidCredentials();
    }

    const isPasswordValid = await bcrypt.compare(record.password, user.password);

    if (!isPasswordValid) {
        throwInvalidCredentials();
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;

    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
};
